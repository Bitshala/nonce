import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CohortsService } from '@/cohorts/cohorts.service';
import { ExerciseScore } from '@/entities/exercise-score.entity';
import { ExerciseScoreWritebackService } from '@/assignments/exercise-score-writeback.service';
import { UpdateCohortRequestDto } from '@/cohorts/cohorts.request.dto';
import { Cohort } from '@/entities/cohort.entity';
import { CohortMembership } from '@/entities/cohort-membership.entity';
import { CohortWeek } from '@/entities/cohort-week.entity';
import { CohortWaitlist } from '@/entities/cohort-waitlist.entity';
import { User } from '@/entities/user.entity';
import { Certificate } from '@/entities/certificate.entity';
import { APITask } from '@/entities/api-task.entity';
import { DbTransactionService } from '@/db-transaction/db-transaction.service';
import { DiscordClient } from '@/discord-client/discord.client';
import { MailService } from '@/mail/mail.service';
import { CohortsConfigService } from '@/cohorts/cohorts.config.service';
import { CohortCalendarService } from '@/cohort-calendar/cohort-calendar.service';
import { CohortType, CohortWeekType } from '@/common/enum';

// The registration deadline is a date, but registration should stay open
// through the whole of that day in IST (23:59:59.999 IST = 18:29:59.999 UTC).
// These tests pin that normalization and the resulting join cutoff.
describe('CohortsService — registration deadline (end-of-day IST)', () => {
    let service: CohortsService;

    const cohortRepository = { findOne: jest.fn() };
    const cohortMembershipRepository = { exists: jest.fn() };
    const cohortWaitlistRepository = { findOne: jest.fn() };
    const mailService = { sendCohortJoiningConfirmationEmail: jest.fn() };
    const cohortCalendarService = { generateCalendarInvite: jest.fn() };
    // Runs the callback with a manager whose save() is a no-op sink, and that
    // finds whatever submissions a test puts in `existingSubmissions`.
    let existingSubmissions: { id: string }[] = [];
    const manager = {
        save: jest.fn(async () => undefined),
        find: jest.fn(async () => existingSubmissions),
    };
    const dbTransactionService = {
        execute: jest.fn(async (cb: (m: unknown) => unknown) => cb(manager)),
    };
    const scoreWriteback = { sync: jest.fn(async () => undefined) };
    const configService = { getOrThrow: jest.fn(() => 'discord-role-id') };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CohortsService,
                {
                    provide: getRepositoryToken(Cohort),
                    useValue: cohortRepository,
                },
                {
                    provide: getRepositoryToken(CohortMembership),
                    useValue: cohortMembershipRepository,
                },
                { provide: getRepositoryToken(CohortWeek), useValue: {} },
                {
                    provide: getRepositoryToken(CohortWaitlist),
                    useValue: cohortWaitlistRepository,
                },
                { provide: getRepositoryToken(User), useValue: {} },
                { provide: getRepositoryToken(Certificate), useValue: {} },
                { provide: getRepositoryToken(APITask), useValue: {} },
                {
                    provide: DbTransactionService,
                    useValue: dbTransactionService,
                },
                { provide: DiscordClient, useValue: {} },
                { provide: ConfigService, useValue: configService },
                { provide: MailService, useValue: mailService },
                { provide: CohortsConfigService, useValue: {} },
                {
                    provide: CohortCalendarService,
                    useValue: cohortCalendarService,
                },
                {
                    provide: ExerciseScoreWritebackService,
                    useValue: scoreWriteback,
                },
            ],
        }).compile();

        service = module.get(CohortsService);
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.resetAllMocks();
        existingSubmissions = [];
        manager.find.mockImplementation(async () => existingSubmissions);
        dbTransactionService.execute.mockImplementation(
            async (cb: (m: unknown) => unknown) => cb(manager),
        );
    });

    it('normalizes a date-only deadline to end-of-day IST on update', async () => {
        const cohort = {
            id: 'cohort-1',
            type: CohortType.MASTERING_BITCOIN,
            startDate: new Date('2026-08-01T00:00:00.000Z'),
            registrationDeadline: new Date('2026-07-01T00:00:00.000Z'),
            weeks: [],
        } as unknown as Cohort;
        cohortRepository.findOne.mockResolvedValue(cohort);

        await service.updateCohort('cohort-1', {
            registrationDeadline: '2026-08-20',
        } as UpdateCohortRequestDto);

        // 23:59:59.999 IST on Aug 20 == 18:29:59.999 UTC on Aug 20.
        expect(cohort.registrationDeadline.toISOString()).toBe(
            '2026-08-20T18:29:59.999Z',
        );
    });

    it('allows joining late in the deadline day (23:00 IST)', async () => {
        const cohort = {
            id: 'cohort-1',
            type: CohortType.MASTERING_BITCOIN,
            registrationDeadline: new Date('2026-08-20T18:29:59.999Z'),
            weeks: [],
        } as unknown as Cohort;
        cohortRepository.findOne.mockResolvedValue(cohort);
        cohortMembershipRepository.exists.mockResolvedValue(false);
        cohortWaitlistRepository.findOne.mockResolvedValue(null);
        cohortCalendarService.generateCalendarInvite.mockResolvedValue(
            'invite',
        );
        mailService.sendCohortJoiningConfirmationEmail.mockResolvedValue(
            undefined,
        );
        const user = {
            id: 'user-1',
            email: 'a@b.com',
            displayName: 'A',
        } as unknown as User;

        // 23:00 IST on Aug 20 == 17:30 UTC on Aug 20 — still before the cutoff.
        jest.useFakeTimers().setSystemTime(
            new Date('2026-08-20T17:30:00.000Z'),
        );

        await expect(
            service.joinCohort(user, 'cohort-1'),
        ).resolves.toBeUndefined();
    });

    it('rejects joining just after midnight IST the next day', async () => {
        const cohort = {
            id: 'cohort-1',
            type: CohortType.MASTERING_BITCOIN,
            registrationDeadline: new Date('2026-08-20T18:29:59.999Z'),
            weeks: [],
        } as unknown as Cohort;
        cohortRepository.findOne.mockResolvedValue(cohort);
        const user = {
            id: 'user-1',
            email: 'a@b.com',
            displayName: 'A',
        } as unknown as User;

        // 00:30 IST on Aug 21 == 19:00 UTC on Aug 20 — past the cutoff.
        jest.useFakeTimers().setSystemTime(
            new Date('2026-08-20T19:00:00.000Z'),
        );

        await expect(service.joinCohort(user, 'cohort-1')).rejects.toThrow(
            BadRequestException,
        );
    });

    it("restores a returning student's scores from the work they already did", async () => {
        // Removal deletes the ExerciseScore rows but keeps the submissions,
        // so a rejoin would otherwise seed a passed student back to zero.
        cohortRepository.findOne.mockResolvedValue({
            id: 'cohort-1',
            type: CohortType.MASTERING_BITCOIN,
            registrationDeadline: new Date(Date.now() + 86_400_000),
            weeks: [
                {
                    id: 'week-1',
                    type: CohortWeekType.GROUP_DISCUSSION,
                    hasExercise: true,
                },
            ],
        } as unknown as Cohort);
        cohortMembershipRepository.exists.mockResolvedValue(false);
        cohortWaitlistRepository.findOne.mockResolvedValue(null);
        cohortCalendarService.generateCalendarInvite.mockResolvedValue(
            'invite',
        );
        mailService.sendCohortJoiningConfirmationEmail.mockResolvedValue(
            undefined,
        );
        existingSubmissions = [{ id: 'submission-1' }];

        await service.joinCohort(
            { id: 'user-1', email: 'a@b.com' } as unknown as User,
            'cohort-1',
        );

        expect(scoreWriteback.sync).toHaveBeenCalledWith(
            manager,
            'submission-1',
        );
        // Only after the fresh rows are saved; before, there is nothing to
        // write to.
        const scoresSaved = (manager.save.mock.calls as unknown[][]).findIndex(
            ([rows]) => Array.isArray(rows) && rows[0] instanceof ExerciseScore,
        );
        expect(scoresSaved).toBeGreaterThanOrEqual(0);
        expect(scoreWriteback.sync.mock.invocationCallOrder[0]).toBeGreaterThan(
            manager.save.mock.invocationCallOrder[scoresSaved],
        );
    });
});
