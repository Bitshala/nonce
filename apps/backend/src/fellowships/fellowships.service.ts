import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, LessThan, Repository } from 'typeorm';
import { Fellowship } from '@/entities/fellowship.entity';
import { APITask } from '@/entities/api-task.entity';
import { User } from '@/entities/user.entity';
import {
    FellowshipSortBy,
    ListFellowshipsQueryDto,
    StartFellowshipContractDto,
} from '@/fellowships/fellowships.request.dto';
import { FellowshipStatus, SortOrder } from '@/common/enum';
import {
    FellowshipResponseDto,
    PublicFellowResponseDto,
} from '@/fellowships/fellowships.response.dto';
import { PaginatedDataDto, PaginatedQueryDto } from '@/common/dto';
import { UserRole } from '@/common/enum';
import { addMonths, escapeLikePattern } from '@/common/common';
import { DbTransactionService } from '@/db-transaction/db-transaction.service';
import { TaskType } from '@/task-processor/task.enums';
import { isLastRetry } from '@/task-processor/task-processor.utils';
import { FellowDiscordRolesService } from '@/fellowships/fellow-discord-roles.service';

// The sweep runs daily at this UTC hour.
const COMPLETE_ENDED_FELLOWSHIPS_HOUR_UTC = 4;

const FELLOWSHIP_SORT_COLUMNS: Record<FellowshipSortBy, string> = {
    [FellowshipSortBy.CREATED_AT]: 'fellowship.createdAt',
    [FellowshipSortBy.START_DATE]: 'fellowship.startDate',
    [FellowshipSortBy.END_DATE]: 'fellowship.endDate',
    [FellowshipSortBy.AMOUNT_USD]: 'fellowship.amountUsd',
};

@Injectable()
export class FellowshipsService {
    private readonly logger = new Logger(FellowshipsService.name);

    constructor(
        @InjectRepository(Fellowship)
        private readonly fellowshipRepository: Repository<Fellowship>,
        @InjectRepository(APITask)
        private readonly apiTaskRepository: Repository<APITask<any>>,
        private readonly dbTransactionService: DbTransactionService,
        private readonly fellowDiscordRolesService: FellowDiscordRolesService,
    ) {}

    async startContract(
        fellowshipId: string,
        dto: StartFellowshipContractDto,
    ): Promise<FellowshipResponseDto> {
        const fellowship = await this.fellowshipRepository.findOne({
            where: { id: fellowshipId },
            relations: {
                user: true,
                application: true,
            },
        });

        if (!fellowship) {
            throw new NotFoundException('Fellowship not found');
        }

        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);

        if (endDate <= startDate) {
            throw new BadRequestException('End date must be after start date');
        }

        // Cap the contract end date at 24 months from today, the same ceiling
        // the removed `periodMonths` field enforced via @Max(24).
        const maxEndDate = addMonths(new Date(), 24);
        if (endDate > maxEndDate) {
            throw new BadRequestException(
                'End date cannot be more than 24 months from today',
            );
        }

        await this.dbTransactionService.execute(async (manager) => {
            // Re-read under a write lock: the status checked above is a
            // pre-lock value that a concurrent document sync may have moved.
            const locked = await manager.findOne(Fellowship, {
                where: { id: fellowshipId },
                lock: { mode: 'pessimistic_write' },
            });
            if (!locked) {
                throw new NotFoundException('Fellowship not found');
            }
            if (locked.status !== FellowshipStatus.DOCUMENTS_APPROVED) {
                throw new BadRequestException(
                    locked.status === FellowshipStatus.ACTIVE ||
                        locked.status === FellowshipStatus.COMPLETED
                        ? 'Fellowship contract has already been started'
                        : 'Both fellowship documents must be approved before starting the contract',
                );
            }

            fellowship.startDate = startDate;
            fellowship.endDate = endDate;
            fellowship.amountUsd = dto.amountUsd.toString();
            fellowship.status = FellowshipStatus.ACTIVE;

            await manager.update(Fellowship, fellowshipId, {
                startDate: fellowship.startDate,
                endDate: fellowship.endDate,
                amountUsd: fellowship.amountUsd,
                status: fellowship.status,
            });
        });

        return FellowshipResponseDto.fromEntity(fellowship);
    }

    async getMyFellowships(
        user: User,
        query: PaginatedQueryDto,
    ): Promise<PaginatedDataDto<FellowshipResponseDto>> {
        const [records, totalRecords] =
            await this.fellowshipRepository.findAndCount({
                where: { user: { id: user.id } },
                relations: {
                    user: true,
                    application: true,
                },
                order: { createdAt: 'DESC' },
                skip: query.page * query.pageSize,
                take: query.pageSize,
            });

        return new PaginatedDataDto({
            totalRecords,
            records: records.map(FellowshipResponseDto.fromEntity),
        });
    }

    async getUserFellowships(userId: string): Promise<FellowshipResponseDto[]> {
        const fellowships = await this.fellowshipRepository.find({
            where: { user: { id: userId } },
            relations: {
                user: true,
                application: true,
            },
            order: { createdAt: 'DESC' },
        });

        return fellowships.map(FellowshipResponseDto.fromEntity);
    }

    async getFellowshipById(
        id: string,
        user: User,
    ): Promise<FellowshipResponseDto> {
        const fellowship = await this.fellowshipRepository.findOne({
            where: { id },
            relations: {
                user: true,
                application: true,
            },
        });

        if (!fellowship) {
            throw new NotFoundException('Fellowship not found');
        }

        if (fellowship.user.id !== user.id && user.role !== UserRole.ADMIN) {
            throw new ForbiddenException();
        }

        return FellowshipResponseDto.fromEntity(fellowship);
    }

    async listFellowships(
        query: ListFellowshipsQueryDto,
    ): Promise<PaginatedDataDto<FellowshipResponseDto>> {
        const qb = this.fellowshipRepository
            .createQueryBuilder('fellowship')
            .leftJoinAndSelect('fellowship.user', 'user')
            .leftJoinAndSelect('fellowship.application', 'application');

        if (query.status) {
            qb.andWhere('fellowship.status = :status', {
                status: query.status,
            });
        }

        if (query.type) {
            qb.andWhere('fellowship.type = :type', { type: query.type });
        }

        if (query.kind) {
            qb.andWhere('fellowship.kind = :kind', { kind: query.kind });
        }

        if (query.search) {
            qb.andWhere(
                new Brackets((w) =>
                    w
                        .where('application.projectName ILIKE :search')
                        .orWhere('application.mentorContact ILIKE :search')
                        .orWhere('application.github ILIKE :search')
                        .orWhere('user.name ILIKE :search')
                        .orWhere('user.discordUserName ILIKE :search')
                        .orWhere('user.discordGlobalName ILIKE :search')
                        .orWhere('user.email ILIKE :search'),
                ),
                { search: `%${escapeLikePattern(query.search)}%` },
            );
        }

        const order = query.sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';

        const [records, totalRecords] = await qb
            .orderBy(FELLOWSHIP_SORT_COLUMNS[query.sortBy], order, 'NULLS LAST')
            .addOrderBy('fellowship.id', 'ASC')
            .skip(query.page * query.pageSize)
            .take(query.pageSize)
            .getManyAndCount();

        return new PaginatedDataDto({
            totalRecords,
            records: records.map(FellowshipResponseDto.fromEntity),
        });
    }

    /**
     * Moves every ACTIVE fellowship whose contract has ended to COMPLETED.
     * Idempotent: a second run finds nothing left to update. Returns the number
     * of fellowships transitioned.
     */
    async completeEndedFellowships(now: Date = new Date()): Promise<number> {
        // A null endDate never matches `<`, so ACTIVE rows without one are left alone.
        const result = await this.fellowshipRepository.update(
            { status: FellowshipStatus.ACTIVE, endDate: LessThan(now) },
            { status: FellowshipStatus.COMPLETED },
        );
        return result.affected ?? 0;
    }

    async handleCompleteEndedFellowships(
        task: APITask<TaskType.COMPLETE_ENDED_FELLOWSHIPS>,
    ): Promise<void> {
        try {
            const completed = await this.completeEndedFellowships();
            if (completed > 0) {
                this.logger.log(
                    `Marked ${completed} ended fellowship(s) as COMPLETED`,
                );
            }

            // After the sweep, so a fellowship completed this run loses its
            // role in the same run.
            await this.syncFellowDiscordRoles();

            await this.scheduleNextCompleteEndedFellowships();
        } catch (error) {
            this.logger.error(
                `Failed to complete ended fellowships: ${error?.message}`,
                error?.stack,
            );

            // Queue the next run before giving up, or one bad day ends the chain.
            if (isLastRetry(task)) {
                await this.scheduleNextCompleteEndedFellowships();
            }

            throw error;
        }
    }

    // Best-effort: a Discord outage or a missing bot permission must not fail
    // the sweep, whose retries would re-run it for nothing. The next daily run
    // recomputes every role from scratch, so a skipped run self-heals.
    private async syncFellowDiscordRoles(): Promise<void> {
        try {
            const { granted, removed, failed, notInGuild } =
                await this.fellowDiscordRolesService.syncFellowRoles();
            if (granted || removed || failed || notInGuild) {
                this.logger.log(
                    `Fellow Discord roles: ${granted} granted, ${removed} removed, ${failed} failed, ${notInGuild} active fellow(s) not in the guild`,
                );
            }
        } catch (error) {
            this.logger.error(
                `Failed to sync fellow Discord roles: ${error?.message}`,
                error?.stack,
            );
        }
    }

    // The next 04:00 UTC strictly after `now`, anchored to the clock rather than
    // to the finished task so downtime does not queue a burst of catch-up runs.
    async scheduleNextCompleteEndedFellowships(
        now: Date = new Date(),
    ): Promise<void> {
        const nextExecuteOnTime = new Date(
            Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate(),
                COMPLETE_ENDED_FELLOWSHIPS_HOUR_UTC,
            ),
        );
        if (nextExecuteOnTime <= now) {
            nextExecuteOnTime.setUTCDate(nextExecuteOnTime.getUTCDate() + 1);
        }

        const nextTask = new APITask<TaskType.COMPLETE_ENDED_FELLOWSHIPS>();
        nextTask.type = TaskType.COMPLETE_ENDED_FELLOWSHIPS;
        nextTask.data = {};
        nextTask.executeOnTime = nextExecuteOnTime;
        await this.apiTaskRepository.save(nextTask);
    }

    async listPublicFellows(
        query: PaginatedQueryDto,
    ): Promise<PaginatedDataDto<PublicFellowResponseDto>> {
        const [records, totalRecords] =
            await this.fellowshipRepository.findAndCount({
                where: { status: FellowshipStatus.ACTIVE },
                relations: { user: true, application: true },
                order: { createdAt: 'DESC', id: 'ASC' },
                skip: query.page * query.pageSize,
                take: query.pageSize,
            });

        return new PaginatedDataDto({
            totalRecords,
            records: records.map(PublicFellowResponseDto.fromEntity),
        });
    }
}
