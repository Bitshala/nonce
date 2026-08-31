import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Brackets } from 'typeorm';
import { UsersService } from '@/users/users.service';
import { ListUsersQueryDto, UserSortBy } from '@/users/users.request';
import { User } from '@/entities/user.entity';
import { ScoresService } from '@/scores/scores.service';
import { CertificatesService } from '@/certificates/certificates.service';
import { FellowshipsService } from '@/fellowships/fellowships.service';
import {
    CohortMatchMode,
    CohortType,
    SortOrder,
    UserRole,
} from '@/common/enum';

const LBTCL = CohortType.LEARNING_BITCOIN_FROM_COMMAND_LINE;
const BPD = CohortType.BITCOIN_PROTOCOL_DEVELOPMENT;

// The completed-cohort filters are pure SQL assembly, so these tests inspect the
// clauses handed to the query builder rather than the rows a database returns.
// The SQL semantics themselves (distinct courses, ANY vs ALL, paging) are pinned
// by exercising them against Postgres; what can silently regress here is which
// clause gets built for which query, which is what this file guards.
describe('UsersService.searchUsers — completed-cohort filters', () => {
    let service: UsersService;

    // Records every andWhere the service adds. Sub-queries are stubbed to a
    // marker string so a clause can be identified without matching real SQL.
    let andWhereCalls: {
        condition: unknown;
        params?: Record<string, unknown>;
    }[];
    let pageOfUsers: User[];

    const makeUser = (id: string): User =>
        ({
            id,
            name: `user-${id}`,
            email: `${id}@test.invalid`,
            discordUserName: `discord-${id}`,
            discordGlobalName: null,
            role: UserRole.STUDENT,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            displayName: `user-${id}`,
        }) as User;

    const makeSubQueryBuilder = () => {
        let restricted = false;
        const sub: Record<string, jest.Mock> = {
            select: jest.fn(() => sub),
            from: jest.fn(() => sub),
            innerJoin: jest.fn(() => sub),
            where: jest.fn(() => sub),
            andWhere: jest.fn(() => {
                restricted = true;
                return sub;
            }),
            getQuery: jest.fn(() =>
                restricted ? '(COUNT_RESTRICTED)' : '(COUNT_ALL)',
            ),
        };
        return sub;
    };

    const queryBuilder: Record<string, jest.Mock> = {
        andWhere: jest.fn(
            (condition: unknown, params?: Record<string, unknown>) => {
                andWhereCalls.push({ condition, params });
                return queryBuilder;
            },
        ),
        subQuery: jest.fn(() => makeSubQueryBuilder()),
        orderBy: jest.fn(() => queryBuilder),
        addOrderBy: jest.fn(() => queryBuilder),
        skip: jest.fn(() => queryBuilder),
        take: jest.fn(() => queryBuilder),
        getManyAndCount: jest.fn(async () => [pageOfUsers, pageOfUsers.length]),
    };

    const userRepository = {
        createQueryBuilder: jest.fn(() => queryBuilder),
    };
    const certificatesService = {
        getCompletedCohortTypesByUserIds: jest.fn(
            async () => new Map<string, CohortType[]>(),
        ),
    };

    /** Only the completed-cohort clauses: the search clause is a Brackets. */
    const filterClauses = () =>
        andWhereCalls.filter((call) => typeof call.condition === 'string') as {
            condition: string;
            params: Record<string, unknown>;
        }[];

    const query = (overrides: Partial<ListUsersQueryDto> = {}) =>
        ({
            page: 0,
            pageSize: 25,
            sortBy: UserSortBy.CREATED_AT,
            sortOrder: SortOrder.DESC,
            completedCohortMatch: CohortMatchMode.ANY,
            ...overrides,
        }) as ListUsersQueryDto;

    beforeEach(async () => {
        jest.clearAllMocks();
        andWhereCalls = [];
        pageOfUsers = [makeUser('a'), makeUser('b')];

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                {
                    provide: getRepositoryToken(User),
                    useValue: userRepository,
                },
                {
                    provide: ConfigService,
                    useValue: { getOrThrow: jest.fn(() => 'discord-role-id') },
                },
                { provide: ScoresService, useValue: {} },
                { provide: CertificatesService, useValue: certificatesService },
                { provide: FellowshipsService, useValue: {} },
            ],
        }).compile();

        service = module.get<UsersService>(UsersService);
    });

    it('adds no completed-cohort clause when neither filter is supplied', async () => {
        await service.searchUsers(query({ search: 'ada' }));

        expect(filterClauses()).toHaveLength(0);
        // The search filter is untouched by this change.
        expect(andWhereCalls).toHaveLength(1);
        expect(andWhereCalls[0].condition).toBeInstanceOf(Brackets);
    });

    it('filters on a minimum number of distinct completed courses', async () => {
        await service.searchUsers(query({ minCompletedCohorts: 3 }));

        const [clause] = filterClauses();
        expect(clause.condition).toBe('(COUNT_ALL) >= :minCompletedCohorts');
        expect(clause.params).toEqual({ minCompletedCohorts: 3 });
    });

    // Zero is what the UI sends for a cleared field, and it excludes nobody.
    it('treats a minimum of zero as no filter at all', async () => {
        await service.searchUsers(query({ minCompletedCohorts: 0 }));

        expect(filterClauses()).toHaveLength(0);
    });

    it('requires a single match for ANY', async () => {
        await service.searchUsers(
            query({
                completedCohortTypes: [LBTCL, BPD],
                completedCohortMatch: CohortMatchMode.ANY,
            }),
        );

        const [clause] = filterClauses();
        expect(clause.condition).toBe(
            '(COUNT_RESTRICTED) >= :requiredCourseCount',
        );
        expect(clause.params).toEqual({
            completedCohortTypes: [LBTCL, BPD],
            requiredCourseCount: 1,
        });
    });

    it('requires every requested course for ALL', async () => {
        await service.searchUsers(
            query({
                completedCohortTypes: [LBTCL, BPD],
                completedCohortMatch: CohortMatchMode.ALL,
            }),
        );

        const [clause] = filterClauses();
        expect(clause.params).toEqual({
            completedCohortTypes: [LBTCL, BPD],
            requiredCourseCount: 2,
        });
    });

    // The required count is the list's length, so a repeated course would
    // otherwise demand two matches that no single course can ever satisfy.
    it('deduplicates repeated courses before counting them for ALL', async () => {
        await service.searchUsers(
            query({
                completedCohortTypes: [LBTCL, LBTCL],
                completedCohortMatch: CohortMatchMode.ALL,
            }),
        );

        const [clause] = filterClauses();
        expect(clause.params).toEqual({
            completedCohortTypes: [LBTCL],
            requiredCourseCount: 1,
        });
    });

    it('adds no clause for an empty course list', async () => {
        await service.searchUsers(query({ completedCohortTypes: [] }));

        expect(filterClauses()).toHaveLength(0);
    });

    it('applies both filters independently when both are supplied', async () => {
        await service.searchUsers(
            query({
                minCompletedCohorts: 2,
                completedCohortTypes: [LBTCL],
                completedCohortMatch: CohortMatchMode.ALL,
            }),
        );

        expect(filterClauses().map((clause) => clause.condition)).toEqual([
            '(COUNT_ALL) >= :minCompletedCohorts',
            '(COUNT_RESTRICTED) >= :requiredCourseCount',
        ]);
    });
});

describe('UsersService.searchUsers — completed courses on each row', () => {
    let service: UsersService;
    let pageOfUsers: User[];

    const makeUser = (id: string): User =>
        ({
            id,
            name: `user-${id}`,
            email: null,
            discordUserName: `discord-${id}`,
            discordGlobalName: null,
            role: UserRole.STUDENT,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            displayName: `user-${id}`,
        }) as User;

    const queryBuilder: Record<string, jest.Mock> = {
        andWhere: jest.fn(() => queryBuilder),
        subQuery: jest.fn(() => queryBuilder),
        orderBy: jest.fn(() => queryBuilder),
        addOrderBy: jest.fn(() => queryBuilder),
        skip: jest.fn(() => queryBuilder),
        take: jest.fn(() => queryBuilder),
        getManyAndCount: jest.fn(async () => [pageOfUsers, pageOfUsers.length]),
    };
    const certificatesService = {
        getCompletedCohortTypesByUserIds: jest.fn(
            async () =>
                new Map<string, CohortType[]>([
                    ['a', [LBTCL, BPD]],
                    // 'b' deliberately absent: a user with no certificates.
                ]),
        ),
    };

    beforeEach(async () => {
        jest.clearAllMocks();
        pageOfUsers = [makeUser('a'), makeUser('b')];

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                {
                    provide: getRepositoryToken(User),
                    useValue: { createQueryBuilder: () => queryBuilder },
                },
                {
                    provide: ConfigService,
                    useValue: { getOrThrow: jest.fn(() => 'discord-role-id') },
                },
                { provide: ScoresService, useValue: {} },
                { provide: CertificatesService, useValue: certificatesService },
                { provide: FellowshipsService, useValue: {} },
            ],
        }).compile();

        service = module.get<UsersService>(UsersService);
    });

    it('looks the page up in one batch and lands each result on its own row', async () => {
        const result = await service.searchUsers({
            page: 0,
            pageSize: 25,
            sortBy: UserSortBy.CREATED_AT,
            sortOrder: SortOrder.DESC,
            completedCohortMatch: CohortMatchMode.ANY,
        } as ListUsersQueryDto);

        expect(
            certificatesService.getCompletedCohortTypesByUserIds,
        ).toHaveBeenCalledTimes(1);
        expect(
            certificatesService.getCompletedCohortTypesByUserIds,
        ).toHaveBeenCalledWith(['a', 'b']);

        expect(result.records[0].completedCohortTypes).toEqual([LBTCL, BPD]);
        // A user with no certificates gets an empty list, not undefined.
        expect(result.records[1].completedCohortTypes).toEqual([]);
    });

    it('returns an empty page without inventing rows', async () => {
        pageOfUsers = [];

        const result = await service.searchUsers({
            page: 0,
            pageSize: 25,
            sortBy: UserSortBy.CREATED_AT,
            sortOrder: SortOrder.DESC,
            completedCohortMatch: CohortMatchMode.ANY,
        } as ListUsersQueryDto);

        expect(result.records).toEqual([]);
        expect(result.totalRecords).toBe(0);
        expect(
            certificatesService.getCompletedCohortTypesByUserIds,
        ).toHaveBeenCalledWith([]);
    });
});
