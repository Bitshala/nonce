import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { CohortsService } from '@/cohorts/cohorts.service';
import {
    UpdateCohortRequestDto,
    UpdateCohortWeekRequestDto,
} from '@/cohorts/cohorts.request.dto';
import { Cohort } from '@/entities/cohort.entity';
import { CohortMembership } from '@/entities/cohort-membership.entity';
import { CohortWeek } from '@/entities/cohort-week.entity';
import { CohortWaitlist } from '@/entities/cohort-waitlist.entity';
import { User } from '@/entities/user.entity';
import { Certificate } from '@/entities/certificate.entity';
import { APITask } from '@/entities/api-task.entity';
import { Assignment } from '@/entities/assignment.entity';
import { DbTransactionService } from '@/db-transaction/db-transaction.service';
import { DiscordClient } from '@/discord-client/discord.client';
import { MailService } from '@/mail/mail.service';
import { CohortsConfigService } from '@/cohorts/cohorts.config.service';
import { CohortCalendarService } from '@/cohort-calendar/cohort-calendar.service';
import {
    AssignmentDeadlineSource,
    CohortType,
    CohortWeekType,
} from '@/common/enum';

/**
 * Every exercise is due at graduation, and `Assignment.deadline` is a stored
 * date — so any path that moves a week has to recompute it. Miss one and the
 * deadline quietly keeps pointing at the old calendar, which nothing surfaces
 * until a student is marked late for a date that no longer exists.
 *
 * These drive the two paths that move dates and check the deadlines followed.
 */
describe('CohortsService — deadlines follow the cohort calendar', () => {
    let service: CohortsService;

    const cohortRepository = { findOne: jest.fn() };
    const cohortWeekRepository = { findOne: jest.fn() };

    // Weeks the fake manager hands back to syncAssignmentDeadlines. The same
    // objects the service mutates, so a shift is visible here the way it would
    // be after a real save.
    let weeks: CohortWeek[] = [];

    // Self-referential, so it needs the annotation to be inferrable.
    const queryBuilder: Record<string, jest.Mock> = {
        update: jest.fn(() => queryBuilder),
        set: jest.fn(() => queryBuilder),
        where: jest.fn(() => queryBuilder),
        andWhere: jest.fn(() => queryBuilder),
        execute: jest.fn(async () => undefined),
    };

    // syncAssignmentDeadlines re-reads the weeks inside the same transaction,
    // so it sees writes made earlier in it. Model that: a saved CohortWeek
    // lands back in the shared array, which is what makes the "graduation week
    // alone moved" case meaningful.
    const manager = {
        save: jest.fn(async (entity: unknown, maybeRows?: unknown) => {
            const rows = (maybeRows ?? entity) as unknown;
            for (const row of Array.isArray(rows) ? rows : [rows]) {
                const saved = row as CohortWeek;
                if (!saved?.id || saved.scheduledDate === undefined) continue;
                const existing = weeks.find((w) => w.id === saved.id);
                if (existing) existing.scheduledDate = saved.scheduledDate;
            }
            return undefined;
        }),
        find: jest.fn(async () => weeks),
        createQueryBuilder: jest.fn(() => queryBuilder),
    };

    const dbTransactionService = {
        execute: jest.fn(async (cb: (m: unknown) => unknown) => cb(manager)),
    };

    const START = new Date('2026-03-02T00:00:00.000Z');
    const GD_SESSIONS = 5;
    const GRADUATION_WEEK = GD_SESSIONS + 1;

    const weekDate = (week: number): Date => {
        const date = new Date(START);
        date.setUTCDate(date.getUTCDate() + week * 7);
        return date;
    };

    const assignment = (slug: string): Assignment =>
        ({
            slug,
            deadlineSource: AssignmentDeadlineSource.GRADUATION,
            deadlineDaysAfterWeek: null,
            deadline: null,
        }) as Assignment;

    const buildWeeks = (): CohortWeek[] =>
        Array.from({ length: GRADUATION_WEEK + 1 }, (_, number) => {
            const isGraduation = number === GRADUATION_WEEK;
            return {
                id: `week-${number}`,
                week: number,
                scheduledDate: weekDate(number),
                type: isGraduation
                    ? CohortWeekType.GRADUATION
                    : CohortWeekType.GROUP_DISCUSSION,
                // Exercises on weeks 1..gdSessions.
                assignment:
                    number >= 1 && number <= GD_SESSIONS
                        ? assignment(`week-${number}`)
                        : null,
            } as unknown as CohortWeek;
        });

    /** What every exercise deadline should be, given a graduation date. */
    const endOfDayIst = (day: Date): string => {
        const at = new Date(day);
        at.setUTCHours(18, 29, 59, 999);
        return at.toISOString();
    };

    const deadlines = (): (string | undefined)[] =>
        weeks
            .filter((w) => w.assignment)
            .map((w) => w.assignment?.deadline?.toISOString());

    beforeEach(async () => {
        weeks = buildWeeks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CohortsService,
                {
                    provide: getRepositoryToken(Cohort),
                    useValue: cohortRepository,
                },
                { provide: getRepositoryToken(CohortMembership), useValue: {} },
                {
                    provide: getRepositoryToken(CohortWeek),
                    useValue: cohortWeekRepository,
                },
                { provide: getRepositoryToken(CohortWaitlist), useValue: {} },
                { provide: getRepositoryToken(User), useValue: {} },
                { provide: getRepositoryToken(Certificate), useValue: {} },
                { provide: getRepositoryToken(APITask), useValue: {} },
                {
                    provide: DbTransactionService,
                    useValue: dbTransactionService,
                },
                { provide: DiscordClient, useValue: {} },
                {
                    provide: ConfigService,
                    useValue: { getOrThrow: jest.fn(() => 'role-id') },
                },
                { provide: MailService, useValue: {} },
                { provide: CohortsConfigService, useValue: {} },
                { provide: CohortCalendarService, useValue: {} },
            ],
        }).compile();

        service = module.get(CohortsService);
    });

    afterEach(() => jest.clearAllMocks());

    it('moves every deadline when the cohort start date shifts', async () => {
        cohortRepository.findOne.mockResolvedValue({
            id: 'cohort-1',
            type: CohortType.BITCOIN_PROTOCOL_DEVELOPMENT,
            startDate: START,
            weeks,
        } as unknown as Cohort);

        // Push the whole cohort back two weeks.
        await service.updateCohort('cohort-1', {
            startDate: '2026-03-16',
        } as UpdateCohortRequestDto);

        const graduation = new Date(weekDate(GRADUATION_WEEK));
        graduation.setUTCDate(graduation.getUTCDate() + 14);

        expect(deadlines()).toEqual(
            Array(GD_SESSIONS).fill(endOfDayIst(graduation)),
        );
    });

    it('moves every deadline when the graduation week alone is rescheduled', async () => {
        cohortWeekRepository.findOne.mockResolvedValue({
            ...weeks[GRADUATION_WEEK],
            cohort: { id: 'cohort-1' },
        } as unknown as CohortWeek);

        // Graduation slips a week; the GD weeks stay where they are.
        await service.updateCohortWeek(`week-${GRADUATION_WEEK}`, {
            scheduledDate: '2026-04-20',
        } as UpdateCohortWeekRequestDto);

        expect(deadlines()).toEqual(
            Array(GD_SESSIONS).fill(
                endOfDayIst(new Date('2026-04-20T00:00:00.000Z')),
            ),
        );
    });

    it('leaves a NONE assignment without a deadline when dates move', async () => {
        for (const week of weeks) {
            if (week.assignment) {
                week.assignment.deadlineSource = AssignmentDeadlineSource.NONE;
            }
        }
        cohortRepository.findOne.mockResolvedValue({
            id: 'cohort-1',
            type: CohortType.BITCOIN_PROTOCOL_DEVELOPMENT,
            startDate: START,
            weeks,
        } as unknown as Cohort);

        await service.updateCohort('cohort-1', {
            startDate: '2026-03-16',
        } as UpdateCohortRequestDto);

        expect(deadlines()).toEqual(Array(GD_SESSIONS).fill(undefined));
    });
});
