import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@/entities/user.entity';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { Certificate } from '@/entities/certificate.entity';
import {
    CohortMatchMode,
    CohortType,
    SortOrder,
    UserRole,
} from '@/common/enum';
import { randomUUID } from 'crypto';
import {
    GetUserResponse,
    UserOverviewResponseDto,
    UserSummaryResponseDto,
} from '@/users/users.response';
import {
    ListUsersQueryDto,
    UpdateUserRequest,
    UpdateUserRoleRequest,
    UserSortBy,
} from '@/users/users.request';
import { ConfigService } from '@nestjs/config';
import { escapeLikePattern } from '@/common/common';
import { PaginatedDataDto } from '@/common/dto';
import { ScoresService } from '@/scores/scores.service';
import { CertificatesService } from '@/certificates/certificates.service';
import { FellowshipsService } from '@/fellowships/fellowships.service';

const USER_SORT_COLUMNS: Record<UserSortBy, string> = {
    [UserSortBy.CREATED_AT]: 'user.createdAt',
    [UserSortBy.NAME]: 'user.name',
    [UserSortBy.EMAIL]: 'user.email',
};

@Injectable()
export class UsersService {
    private readonly adminRoleId: string;
    private readonly teachingAssistantRoleId: string;

    constructor(
        @InjectRepository(User) private userRepository: Repository<User>,
        private readonly configService: ConfigService,
        private readonly scoresService: ScoresService,
        private readonly certificatesService: CertificatesService,
        private readonly fellowshipsService: FellowshipsService,
    ) {
        this.adminRoleId = this.configService.getOrThrow<string>(
            'discord.roles.admin',
        );
        this.teachingAssistantRoleId = this.configService.getOrThrow<string>(
            'discord.roles.teachingAssistant',
        );
    }

    async findByUserId(userId: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });
        if (!user) {
            throw new BadRequestException('User not found');
        }

        return user;
    }

    async createUser(data: {
        email: string | null;
        discordUserId: string;
        discordUsername: string;
        discordGlobalName: string;
        isGuildMember: boolean;
        roles: string[];
    }): Promise<User> {
        const userAlreadyExists = await this.userRepository.exists({
            where: { discordUserId: data.discordUserId },
        });

        if (userAlreadyExists) {
            throw new BadRequestException(
                'User with this email already exists',
            );
        }

        const user = new User();
        user.id = randomUUID();
        user.email = data.email;
        user.discordUserId = data.discordUserId;
        user.discordUserName = data.discordUsername;
        user.discordGlobalName = data.discordGlobalName;
        user.isGuildMember = data.isGuildMember;
        user.role = this.inferUserRoleFromDiscordRoles(data.roles);

        return this.userRepository.save(user);
    }

    private roleRank(role: UserRole): number {
        const ranks: Record<UserRole, number> = {
            [UserRole.STUDENT]: 0,
            [UserRole.TEACHING_ASSISTANT]: 1,
            [UserRole.ADMIN]: 2,
        };
        return ranks[role];
    }

    inferUserRoleFromDiscordRoles(roles: string[]): UserRole {
        if (roles.includes(this.adminRoleId)) return UserRole.ADMIN;
        if (roles.includes(this.teachingAssistantRoleId))
            return UserRole.TEACHING_ASSISTANT;
        return UserRole.STUDENT;
    }

    async upsertUser(data: {
        email: string | null;
        discordUserId: string;
        discordUsername: string;
        discordGlobalName: string;
        isGuildMember: boolean;
        roles: string[];
    }): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { discordUserId: data.discordUserId },
        });

        if (user) {
            user.discordUserName = data.discordUsername;
            user.discordGlobalName = data.discordGlobalName;
            // Only update email if it's not already set
            if (!user.email && data.email) user.email = data.email;
            user.isGuildMember = data.isGuildMember;
            const inferredRole = this.inferUserRoleFromDiscordRoles(data.roles);
            if (this.roleRank(inferredRole) >= this.roleRank(user.role)) {
                user.role = inferredRole;
            }
            return this.userRepository.save(user);
        } else {
            return this.createUser(data);
        }
    }

    getMe(user: User): GetUserResponse {
        return GetUserResponse.fromEntity(user);
    }

    async getUserById(userId: string): Promise<GetUserResponse> {
        const user = await this.findByUserId(userId);
        return GetUserResponse.fromEntity(user);
    }

    /**
     * SQL for "how many distinct courses has this user completed", correlated to
     * the outer `user` row and optionally narrowed to a set of courses.
     *
     * This is a subquery rather than a join with GROUP BY/HAVING on purpose: the
     * outer query paginates with skip/take and getManyAndCount, and a
     * row-multiplying join would corrupt both the page and the total.
     *
     * The join to `user` inside the subquery is what lets the correlation be
     * expressed as `certificateUser.id = user.id`, so the certificate table's
     * join-column names come from entity metadata instead of string literals.
     */
    private completedCourseCountSubQuery(
        qb: SelectQueryBuilder<User>,
        restrictToTypes?: CohortType[],
    ): string {
        const subQuery = qb
            .subQuery()
            .select('COUNT(DISTINCT certificateCohort.type)')
            .from(Certificate, 'certificate')
            .innerJoin('certificate.user', 'certificateUser')
            .innerJoin('certificate.cohort', 'certificateCohort')
            .where('certificateUser.id = user.id');

        if (restrictToTypes) {
            subQuery.andWhere(
                'certificateCohort.type IN (:...completedCohortTypes)',
            );
        }

        return subQuery.getQuery();
    }

    async searchUsers(
        query: ListUsersQueryDto,
    ): Promise<PaginatedDataDto<UserSummaryResponseDto>> {
        const qb = this.userRepository.createQueryBuilder('user');

        if (query.search) {
            qb.andWhere(
                new Brackets((w) =>
                    w
                        .where('user.name ILIKE :search')
                        .orWhere('user.email ILIKE :search')
                        .orWhere('user.discordUserName ILIKE :search')
                        .orWhere('user.discordGlobalName ILIKE :search'),
                ),
                { search: `%${escapeLikePattern(query.search)}%` },
            );
        }

        // A truthy check, not `!== undefined`: a minimum of zero filters nothing
        // out, and is what the UI sends when the field is cleared.
        if (query.minCompletedCohorts) {
            qb.andWhere(
                `${this.completedCourseCountSubQuery(qb)} >= :minCompletedCohorts`,
                { minCompletedCohorts: query.minCompletedCohorts },
            );
        }

        // Deduplicated because the requested count is derived from the list's
        // length: ?completedCohortTypes=LBTCL&completedCohortTypes=LBTCL under
        // ALL asks for one course, not two.
        const completedCohortTypes = [
            ...new Set(query.completedCohortTypes ?? []),
        ];
        if (completedCohortTypes.length > 0) {
            // One comparison covers both modes -- ANY needs any single match,
            // ALL needs as many distinct matches as were requested.
            const requiredCourseCount =
                query.completedCohortMatch === CohortMatchMode.ALL
                    ? completedCohortTypes.length
                    : 1;
            qb.andWhere(
                `${this.completedCourseCountSubQuery(qb, completedCohortTypes)} >= :requiredCourseCount`,
                { completedCohortTypes, requiredCourseCount },
            );
        }

        const order = query.sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';

        const [records, totalRecords] = await qb
            .orderBy(USER_SORT_COLUMNS[query.sortBy], order, 'NULLS LAST')
            .addOrderBy('user.id', 'ASC')
            .skip(query.page * query.pageSize)
            .take(query.pageSize)
            .getManyAndCount();

        const completedByUserId =
            await this.certificatesService.getCompletedCohortTypesByUserIds(
                records.map((user) => user.id),
            );

        return new PaginatedDataDto({
            totalRecords,
            records: records.map((user) =>
                UserSummaryResponseDto.fromEntity(
                    user,
                    completedByUserId.get(user.id) ?? [],
                ),
            ),
        });
    }

    async getUserOverview(userId: string): Promise<UserOverviewResponseDto> {
        const user = await this.findByUserId(userId);

        const [scores, certificates, fellowships] = await Promise.all([
            this.scoresService.getUserScores(userId),
            this.certificatesService.getUserCertificates(userId),
            this.fellowshipsService.getUserFellowships(userId),
        ]);

        return UserOverviewResponseDto.fromParts(
            user,
            scores,
            certificates,
            fellowships,
        );
    }

    async updateMe(
        user: User,
        body: UpdateUserRequest,
    ): Promise<GetUserResponse> {
        if (body.email !== undefined) {
            user.email = body.email;
        }
        if (body.name !== undefined) {
            user.name = body.name;
        }
        if (body.description !== undefined) {
            user.description = body.description;
        }
        if (body.background !== undefined) {
            user.background = body.background;
        }
        if (body.githubProfileUrl !== undefined) {
            user.githubProfileUrl = body.githubProfileUrl;
        }
        if (body.portfolioUrl !== undefined) {
            user.portfolioUrl = body.portfolioUrl;
        }
        if (body.linkedinProfileUrl !== undefined) {
            user.linkedinProfileUrl = body.linkedinProfileUrl;
        }
        if (body.skills !== undefined) {
            user.skills = body.skills ?? [];
        }
        if (body.firstHeardAboutBitcoinOn !== undefined) {
            const date =
                body.firstHeardAboutBitcoinOn !== null
                    ? new Date(body.firstHeardAboutBitcoinOn)
                    : null;
            if (date !== null) date.setUTCHours(0, 0, 0, 0);
            user.firstHeardAboutBitcoinOn =
                date?.toISOString().slice(0, 10) ?? null;
        }
        if (body.bitcoinBooksRead !== undefined) {
            user.bitcoinBooksRead = body.bitcoinBooksRead ?? [];
        }
        if (body.whyBitcoin !== undefined) {
            user.whyBitcoin = body.whyBitcoin;
        }
        if (body.weeklyCohortCommitmentHours !== undefined) {
            user.weeklyCohortCommitmentHours = body.weeklyCohortCommitmentHours;
        }
        if (body.location !== undefined) {
            user.location = body.location;
        }
        if (body.referral !== undefined) {
            user.referral = body.referral;
        }

        await this.userRepository.save(user);
        return GetUserResponse.fromEntity(user);
    }

    async updateUserRole(body: UpdateUserRoleRequest): Promise<void> {
        await this.userRepository.update(body.userId, { role: body.role });
    }
}
