import {
    BadGatewayException,
    BadRequestException,
    ConflictException,
    NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AdminAssignmentsService } from '@/assignments/admin-assignments.service';
import { AdminAssignmentResponseDto } from '@/assignments/assignments.response.dto';
import { RunsService } from '@/assignments/runs.service';
import { ExerciseScoreWritebackService } from '@/assignments/exercise-score-writeback.service';
import { CohortMembership } from '@/entities/cohort-membership.entity';
import { CohortsService } from '@/cohorts/cohorts.service';
import { CohortsConfigService } from '@/cohorts/cohorts.config.service';
import { DbTransactionService } from '@/db-transaction/db-transaction.service';
import { GitHubAppClient } from '@/github-app/client/github-app.client';
import { GitHubClassroomService } from '@/github-classroom/github-classroom.service';
import { MailService } from '@/mail/mail.service';
import { Assignment } from '@/entities/assignment.entity';
import { AssignmentSubmission } from '@/entities/assignment-submission.entity';
import { Cohort } from '@/entities/cohort.entity';
import { CohortWeek } from '@/entities/cohort-week.entity';
import { ExerciseScore } from '@/entities/exercise-score.entity';
import { User } from '@/entities/user.entity';
import { APITaskStatus, TaskType } from '@/task-processor/task.enums';
import { APITask } from '@/entities/api-task.entity';
import {
    AssignmentBackend,
    CohortType,
    CohortWeekType,
    ProvisionStatus,
    UserRole,
} from '@/common/enum';

describe('AdminAssignmentsService', () => {
    let service: AdminAssignmentsService;

    const assignmentRepository = { findOne: jest.fn(), find: jest.fn() };
    const membershipRepository = { find: jest.fn(), count: jest.fn() };
    const lastSyncQuery: Record<string, jest.Mock> = {
        where: jest.fn(),
        andWhere: jest.fn(),
        orderBy: jest.fn(),
        getOne: jest.fn(),
    };
    const apiTaskRepository = { createQueryBuilder: jest.fn() };
    const submissionRepository = { find: jest.fn(), findOne: jest.fn() };
    const runsService = { dispatchRegrade: jest.fn() };
    const exerciseScoreRepository = { exists: jest.fn(), find: jest.fn() };
    const scoreWriteback = { sync: jest.fn() };
    const cohortRepository = { findOne: jest.fn() };
    const cohortsService = { syncAssignmentDeadlines: jest.fn() };
    const cohortsConfigService = { getConfig: jest.fn() };
    const mailService = {
        getCohortShortName: jest.fn(),
        sendClassroomSwitchEmail: jest.fn(),
    };
    const githubClassroomService = {
        fetchFinalResults: jest.fn(),
        applyFinalResults: jest.fn(),
    };
    // Self-referential, so it needs the annotation to be inferrable.
    const queryBuilder: Record<string, jest.Mock> = {
        update: jest.fn(),
        set: jest.fn(),
        where: jest.fn(),
        andWhere: jest.fn(),
        execute: jest.fn(),
    };
    const manager = {
        find: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        save: jest.fn(),
        query: jest.fn(),
        create: jest.fn(),
        createQueryBuilder: jest.fn(),
    };
    const dbTransactionService = {
        execute: jest.fn(async (cb: (m: unknown) => unknown) => cb(manager)),
    };

    const staff = { id: 'staff-1' } as User;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AdminAssignmentsService,
                {
                    provide: getRepositoryToken(Assignment),
                    useValue: assignmentRepository,
                },
                {
                    provide: getRepositoryToken(AssignmentSubmission),
                    useValue: submissionRepository,
                },
                {
                    provide: getRepositoryToken(Cohort),
                    useValue: cohortRepository,
                },
                {
                    provide: getRepositoryToken(CohortMembership),
                    useValue: membershipRepository,
                },
                {
                    provide: getRepositoryToken(ExerciseScore),
                    useValue: exerciseScoreRepository,
                },
                {
                    provide: getRepositoryToken(APITask),
                    useValue: apiTaskRepository,
                },
                { provide: CohortsService, useValue: cohortsService },
                {
                    provide: CohortsConfigService,
                    useValue: cohortsConfigService,
                },
                { provide: GitHubAppClient, useValue: {} },
                { provide: RunsService, useValue: runsService },
                {
                    provide: ExerciseScoreWritebackService,
                    useValue: scoreWriteback,
                },
                {
                    provide: DbTransactionService,
                    useValue: dbTransactionService,
                },
                {
                    provide: GitHubClassroomService,
                    useValue: githubClassroomService,
                },
                { provide: MailService, useValue: mailService },
                { provide: ConfigService, useValue: { get: () => undefined } },
            ],
        }).compile();
        service = module.get(AdminAssignmentsService);
    });

    afterEach(() => {
        jest.resetAllMocks();
        dbTransactionService.execute.mockImplementation(
            async (cb: (m: unknown) => unknown) => cb(manager),
        );
    });

    /**
     * A cohort as `syncAssignments` and `switchToInhouse` load it: orientation,
     * three exercise weeks (the third without an `assignment` block in config)
     * and graduation, a week apart from `start`.
     */
    function seedableCohort(
        assignmentBackend: AssignmentBackend,
        start = new Date('2026-03-02T00:00:00.000Z'),
    ): Cohort {
        const at = (week: number) =>
            new Date(start.getTime() + week * 7 * 24 * 60 * 60 * 1000);
        const week = (n: number, type: CohortWeekType, hasExercise: boolean) =>
            Object.assign(new CohortWeek(), {
                id: `week-${n}`,
                week: n,
                type,
                hasExercise,
                scheduledDate: at(n),
            });
        return Object.assign(new Cohort(), {
            id: 'cohort-1',
            type: CohortType.PROGRAMMING_BITCOIN,
            season: 3,
            hasExercises: true,
            classroomId: '243620',
            assignmentBackend,
            weeks: [
                week(0, CohortWeekType.ORIENTATION, false),
                week(1, CohortWeekType.GROUP_DISCUSSION, true),
                week(2, CohortWeekType.GROUP_DISCUSSION, true),
                week(3, CohortWeekType.GROUP_DISCUSSION, true),
                week(4, CohortWeekType.GRADUATION, false),
            ],
        });
    }

    function assignmentConfig(slug: string) {
        return {
            slug,
            templateOwner: 'Bitshala-Classrooms',
            templateRepo: `${slug}-template`,
            graderTestPath: 'tests',
            deadline: 'GRADUATION' as const,
        };
    }

    /** Week 3 has an exercise but no `assignment` block. */
    const partialConfig = {
        weeks: [
            { hasExercise: true, assignment: assignmentConfig('pb-week-1') },
            { hasExercise: true, assignment: assignmentConfig('pb-week-2') },
            { hasExercise: true },
        ],
    };

    describe('syncAssignments', () => {
        /** Starts tomorrow, so graduation is weeks away. */
        const upcoming = () => new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Week 1 already has its row; week 2 does not.
        let existing: Assignment;

        beforeEach(() => {
            existing = Object.assign(new Assignment(), {
                id: 'assignment-1',
                slug: 'stale-slug',
                cohortWeek: { id: 'week-1' },
            });
            cohortsConfigService.getConfig.mockReturnValue(partialConfig);
            manager.find.mockResolvedValue([existing]);
        });

        it('upserts a row per configured exercise week, then resolves deadlines in the same transaction', async () => {
            cohortRepository.findOne.mockResolvedValue(
                seedableCohort(AssignmentBackend.INHOUSE, upcoming()),
            );

            const result = await service.syncAssignments('cohort-1');

            expect(result).toEqual({ created: 1, updated: 1 });
            expect(dbTransactionService.execute).toHaveBeenCalledTimes(1);
            const [saved] = manager.save.mock.calls[0] as [Assignment[]];
            expect(saved).toHaveLength(2);
            // The existing row is updated in place, not duplicated.
            expect(saved[0]).toBe(existing);
            expect(saved[0].slug).toBe('pb-week-1-s3');
            expect(saved[1].cohortWeek.id).toBe('week-2');
            expect(saved[1].slug).toBe('pb-week-2-s3');
            expect(cohortsService.syncAssignmentDeadlines).toHaveBeenCalledWith(
                manager,
                'cohort-1',
            );
            expect(
                cohortsService.syncAssignmentDeadlines.mock
                    .invocationCallOrder[0],
            ).toBeGreaterThan(manager.save.mock.invocationCallOrder[0]);
        });

        it('409s for a graduated cohort, whose assignments are final', async () => {
            // The default fixture starts in March 2026, long graduated.
            cohortRepository.findOne.mockResolvedValue(
                seedableCohort(AssignmentBackend.INHOUSE),
            );

            await expect(service.syncAssignments('cohort-1')).rejects.toThrow(
                'graduated',
            );
            expect(manager.save).not.toHaveBeenCalled();
        });

        it('refuses a cohort that is not on the in-house backend', async () => {
            cohortRepository.findOne.mockResolvedValue(
                seedableCohort(AssignmentBackend.CLASSROOM),
            );

            await expect(
                service.syncAssignments('cohort-1'),
            ).rejects.toBeInstanceOf(NotFoundException);
            expect(manager.save).not.toHaveBeenCalled();
        });

        it('404s for a cohort that does not exist', async () => {
            cohortRepository.findOne.mockResolvedValue(null);

            await expect(
                service.syncAssignments('cohort-1'),
            ).rejects.toBeInstanceOf(NotFoundException);
            expect(manager.save).not.toHaveBeenCalled();
        });
    });

    describe('switchToInhouse', () => {
        const DAY_MS = 24 * 60 * 60 * 1000;
        /** Week 1 two weeks ago, graduation two weeks from now. */
        const midway = () => new Date(Date.now() - 14 * DAY_MS);

        const fetched = {
            cohortId: 'cohort-1',
            githubUsernameToUserId: new Map(),
            weeks: [],
            failedWeekIds: [],
        };
        const fullConfig = {
            weeks: [
                {
                    hasExercise: true,
                    assignment: assignmentConfig('pb-week-1'),
                },
                {
                    hasExercise: true,
                    assignment: assignmentConfig('pb-week-2'),
                },
                {
                    hasExercise: true,
                    assignment: assignmentConfig('pb-week-3'),
                },
            ],
        };

        beforeEach(() => {
            for (const step of ['update', 'set', 'where', 'andWhere']) {
                queryBuilder[step].mockReturnValue(queryBuilder);
            }
            queryBuilder.execute.mockResolvedValue({ affected: 2 });
            manager.createQueryBuilder.mockReturnValue(queryBuilder);
            manager.update.mockResolvedValue({ affected: 1 });
            manager.find.mockResolvedValue([]);
            // The cohort row as re-read under the lock.
            manager.findOne.mockResolvedValue({
                id: 'cohort-1',
                assignmentBackend: AssignmentBackend.CLASSROOM,
            });
            // Four score rows frozen.
            manager.query.mockResolvedValue([
                { id: 's1' },
                { id: 's2' },
                { id: 's3' },
                { id: 's4' },
            ]);
            cohortsConfigService.getConfig.mockReturnValue(fullConfig);
            githubClassroomService.fetchFinalResults.mockResolvedValue(fetched);
            githubClassroomService.applyFinalResults.mockResolvedValue(2);
            manager.create.mockImplementation(
                (_entity: unknown, fields: object) => fields,
            );
        });

        afterEach(() => jest.useRealTimers());

        /** Nothing reached the database: no transaction, no score touched. */
        const expectNoWrites = () => {
            expect(dbTransactionService.execute).not.toHaveBeenCalled();
            expect(
                githubClassroomService.applyFinalResults,
            ).not.toHaveBeenCalled();
            expect(manager.query).not.toHaveBeenCalled();
            expect(manager.update).not.toHaveBeenCalled();
            expect(manager.save).not.toHaveBeenCalled();
            expect(manager.createQueryBuilder).not.toHaveBeenCalled();
            expect(
                cohortsService.syncAssignmentDeadlines,
            ).not.toHaveBeenCalled();
            expect(scoreWriteback.sync).not.toHaveBeenCalled();
            for (const fn of Object.values(exerciseScoreRepository)) {
                expect(fn).not.toHaveBeenCalled();
            }
        };

        it('flips the backend, cancels Classroom sync and seeds every exercise week in one transaction', async () => {
            cohortRepository.findOne.mockResolvedValue(
                seedableCohort(AssignmentBackend.CLASSROOM, midway()),
            );

            const result = await service.switchToInhouse('cohort-1', 'admin-1');

            expect(result).toEqual({
                created: 3,
                updated: 0,
                cancelledTasks: 2,
                scoresSynced: 2,
                snapshotRows: 4,
                switchedAt: expect.any(String),
            });
            expect(dbTransactionService.execute).toHaveBeenCalledTimes(1);
            // Compare-and-set: only a cohort still on CLASSROOM flips.
            expect(manager.update).toHaveBeenCalledWith(
                Cohort,
                {
                    id: 'cohort-1',
                    assignmentBackend: AssignmentBackend.CLASSROOM,
                },
                {
                    assignmentBackend: AssignmentBackend.INHOUSE,
                    // The audit record of who switched it, and when.
                    switchedFromClassroomAt: expect.any(Date),
                    switchedFromClassroomBy: { id: 'admin-1' },
                },
            );
            expect(queryBuilder.update).toHaveBeenCalledWith(APITask);
            expect(queryBuilder.set).toHaveBeenCalledWith({
                status: APITaskStatus.CANCELLED,
            });
            expect(queryBuilder.where).toHaveBeenCalledWith('type = :type', {
                type: TaskType.SYNC_CLASSROOM_SCORES,
            });
            // Only syncs that would still run; exhausted failures stay as
            // the record of what failed.
            expect(queryBuilder.andWhere).toHaveBeenCalledWith(
                '(status = :unprocessed OR (status = :failed AND "retryCount" < "retryLimit"))',
                {
                    unprocessed: APITaskStatus.UNPROCESSED,
                    failed: APITaskStatus.FAILED,
                },
            );
            expect(queryBuilder.andWhere).toHaveBeenCalledWith(
                "data->>'cohortId' = :cohortId",
                { cohortId: 'cohort-1' },
            );
            const [saved] = manager.save.mock.calls[0] as [Assignment[]];
            expect(saved.map((a) => a.slug)).toEqual([
                'pb-week-1-s3',
                'pb-week-2-s3',
                'pb-week-3-s3',
            ]);
            expect(cohortsService.syncAssignmentDeadlines).toHaveBeenCalledWith(
                manager,
                'cohort-1',
            );
            // Besides the final Classroom read and the snapshot, only
            // assignments and the students' notice are written.
            const [[seeded], [notice]] = manager.save.mock.calls as [
                unknown[],
            ][];
            for (const entity of seeded as unknown[]) {
                expect(entity).toBeInstanceOf(Assignment);
            }
            expect(notice).toEqual({
                type: TaskType.SEND_CLASSROOM_SWITCH_EMAILS,
                data: { cohortId: 'cohort-1' },
            });
            expect(manager.save).toHaveBeenCalledTimes(2);
            expect(scoreWriteback.sync).not.toHaveBeenCalled();
        });

        it('drains Classroom, then freezes its results, before the flip', async () => {
            cohortRepository.findOne.mockResolvedValue(
                seedableCohort(AssignmentBackend.CLASSROOM, midway()),
            );

            await service.switchToInhouse('cohort-1', 'admin-1');

            // Under the lock the periodic sync also takes before it writes.
            expect(manager.findOne).toHaveBeenCalledWith(Cohort, {
                where: { id: 'cohort-1' },
                lock: { mode: 'for_no_key_update' },
            });
            expect(
                githubClassroomService.applyFinalResults,
            ).toHaveBeenCalledWith(manager, fetched);
            const [sql, params] = manager.query.mock.calls[0] as [
                string,
                unknown[],
            ];
            expect(sql).toContain('INSERT INTO "classroom_result_snapshot"');
            expect(sql).toContain('FROM "exercise_score"');
            expect(params).toEqual(['cohort-1']);
            const order = [
                manager.findOne.mock.invocationCallOrder[0],
                githubClassroomService.applyFinalResults.mock
                    .invocationCallOrder[0],
                manager.query.mock.invocationCallOrder[0],
                manager.update.mock.invocationCallOrder[0],
            ];
            expect(order).toEqual([...order].sort((a, b) => a - b));
            // The network read happens before the transaction opens.
            expect(
                githubClassroomService.fetchFinalResults.mock
                    .invocationCallOrder[0],
            ).toBeLessThan(
                dbTransactionService.execute.mock.invocationCallOrder[0],
            );
        });

        it('502s and changes nothing when Classroom cannot be read', async () => {
            // Switching anyway would freeze up to six hours of stale scores.
            cohortRepository.findOne.mockResolvedValue(
                seedableCohort(AssignmentBackend.CLASSROOM, midway()),
            );
            githubClassroomService.fetchFinalResults.mockRejectedValue(
                new Error('GitHub Classroom could not report week 2'),
            );

            const attempt = service.switchToInhouse('cohort-1', 'admin-1');

            await expect(attempt).rejects.toBeInstanceOf(BadGatewayException);
            await expect(attempt).rejects.toThrow('nothing was changed');
            expectNoWrites();
        });

        it('409s, writing nothing, when the cohort switched while Classroom was read', async () => {
            cohortRepository.findOne.mockResolvedValue(
                seedableCohort(AssignmentBackend.CLASSROOM, midway()),
            );
            manager.findOne.mockResolvedValue({
                id: 'cohort-1',
                assignmentBackend: AssignmentBackend.INHOUSE,
            });

            await expect(
                service.switchToInhouse('cohort-1', 'admin-1'),
            ).rejects.toBeInstanceOf(ConflictException);
            expect(
                githubClassroomService.applyFinalResults,
            ).not.toHaveBeenCalled();
            expect(manager.query).not.toHaveBeenCalled();
            expect(manager.update).not.toHaveBeenCalled();
        });

        describe('preview', () => {
            beforeEach(() => {
                for (const step of ['where', 'andWhere', 'orderBy']) {
                    lastSyncQuery[step].mockReturnValue(lastSyncQuery);
                }
                lastSyncQuery.getOne.mockResolvedValue({
                    updatedAt: new Date('2026-10-19T06:00:00.000Z'),
                });
                apiTaskRepository.createQueryBuilder.mockReturnValue(
                    lastSyncQuery,
                );
                membershipRepository.count.mockResolvedValue(24);
            });

            it('shows the impact of a switch that would succeed, writing nothing', async () => {
                cohortRepository.findOne.mockResolvedValue(
                    seedableCohort(AssignmentBackend.CLASSROOM, midway()),
                );

                const preview =
                    await service.previewSwitchToInhouse('cohort-1');

                expect(preview).toMatchObject({
                    canSwitch: true,
                    blockers: [],
                    studentCount: 24,
                    // Week 2 is scheduled for today; week 3 is next week.
                    currentWeek: 2,
                    lastClassroomSyncAt: '2026-10-19T06:00:00.000Z',
                });
                expect(preview.weeksToSeed.map((w) => w.week)).toEqual([
                    1, 2, 3,
                ]);
                // GRADUATION deadlines are resolved, as seeding would.
                for (const week of preview.weeksToSeed) {
                    expect(week.deadline).toEqual(expect.any(String));
                }
                expectNoWrites();
                expect(
                    githubClassroomService.fetchFinalResults,
                ).not.toHaveBeenCalled();
            });

            it('lists every refusal at once, so the admin can fix them together', async () => {
                // Like Building Bitcoin in Rust: exercise weeks, no assignment
                // blocks in config.
                cohortRepository.findOne.mockResolvedValue(
                    Object.assign(
                        seedableCohort(AssignmentBackend.CLASSROOM, midway()),
                        { classroomId: null },
                    ),
                );
                cohortsConfigService.getConfig.mockReturnValue({
                    weeks: [
                        { hasExercise: true },
                        { hasExercise: true },
                        { hasExercise: true },
                    ],
                });

                const preview =
                    await service.previewSwitchToInhouse('cohort-1');

                expect(preview.canSwitch).toBe(false);
                expect(preview.blockers.map((b) => b.code)).toEqual([
                    'NO_CLASSROOM_ID',
                    'UNCONFIGURED_WEEKS',
                ]);
                expect(preview.blockers[1].message).toContain(
                    'exercise week(s) 1, 2, 3',
                );
                expectNoWrites();
            });

            it('404s for a cohort that does not exist', async () => {
                cohortRepository.findOne.mockResolvedValue(null);

                await expect(
                    service.previewSwitchToInhouse('cohort-1'),
                ).rejects.toBeInstanceOf(NotFoundException);
            });
        });

        it('409s when a concurrent switch already flipped the flag, before seeding', async () => {
            cohortRepository.findOne.mockResolvedValue(
                seedableCohort(AssignmentBackend.CLASSROOM, midway()),
            );
            manager.update.mockResolvedValue({ affected: 0 });

            await expect(
                service.switchToInhouse('cohort-1', 'admin-1'),
            ).rejects.toBeInstanceOf(ConflictException);
            expect(manager.createQueryBuilder).not.toHaveBeenCalled();
            expect(manager.save).not.toHaveBeenCalled();
        });

        it('409s, naming the slug, when an assignment slug is already taken', async () => {
            cohortRepository.findOne.mockResolvedValue(
                seedableCohort(AssignmentBackend.CLASSROOM, midway()),
            );
            manager.save.mockRejectedValue(
                new QueryFailedError(
                    'INSERT INTO "assignment"',
                    [],
                    Object.assign(new Error('duplicate key'), {
                        code: '23505',
                        detail: 'Key (slug)=(pb-week-1-s3) already exists.',
                    }),
                ),
            );

            const attempt = service.switchToInhouse('cohort-1', 'admin-1');

            await expect(attempt).rejects.toBeInstanceOf(ConflictException);
            await expect(attempt).rejects.toThrow('pb-week-1-s3');
        });

        it('lets any other database failure through unchanged', async () => {
            cohortRepository.findOne.mockResolvedValue(
                seedableCohort(AssignmentBackend.CLASSROOM, midway()),
            );
            const failure = new Error('connection reset');
            manager.save.mockRejectedValue(failure);

            await expect(
                service.switchToInhouse('cohort-1', 'admin-1'),
            ).rejects.toBe(failure);
        });

        it('404s for a cohort that does not exist', async () => {
            cohortRepository.findOne.mockResolvedValue(null);

            await expect(
                service.switchToInhouse('cohort-1', 'admin-1'),
            ).rejects.toBeInstanceOf(NotFoundException);
            expectNoWrites();
        });

        it('409s for a cohort already on the in-house classroom', async () => {
            cohortRepository.findOne.mockResolvedValue(
                seedableCohort(AssignmentBackend.INHOUSE, midway()),
            );

            await expect(
                service.switchToInhouse('cohort-1', 'admin-1'),
            ).rejects.toBeInstanceOf(ConflictException);
            expectNoWrites();
        });

        it('400s for a cohort with no exercises', async () => {
            cohortRepository.findOne.mockResolvedValue(
                Object.assign(
                    seedableCohort(AssignmentBackend.CLASSROOM, midway()),
                    { hasExercises: false },
                ),
            );

            await expect(
                service.switchToInhouse('cohort-1', 'admin-1'),
            ).rejects.toBeInstanceOf(BadRequestException);
            expectNoWrites();
        });

        it('409s for a cohort with no Classroom id, which would lose its score protection', async () => {
            cohortRepository.findOne.mockResolvedValue(
                Object.assign(
                    seedableCohort(AssignmentBackend.CLASSROOM, midway()),
                    { classroomId: null },
                ),
            );

            await expect(
                service.switchToInhouse('cohort-1', 'admin-1'),
            ).rejects.toBeInstanceOf(ConflictException);
            expectNoWrites();
        });

        it('409s for a graduated cohort and writes nothing, scores included', async () => {
            cohortRepository.findOne.mockResolvedValue(
                seedableCohort(
                    AssignmentBackend.CLASSROOM,
                    new Date(Date.now() - 70 * DAY_MS),
                ),
            );

            await expect(
                service.switchToInhouse('cohort-1', 'admin-1'),
            ).rejects.toThrow('graduated');
            expectNoWrites();
        });

        it('treats graduation day as open until its end in IST, like a deadline', async () => {
            // Graduation (week 4) is 30 March; its deadline 18:29:59.999 UTC.
            const start = new Date('2026-03-02T00:00:00.000Z');
            cohortRepository.findOne.mockResolvedValue(
                seedableCohort(AssignmentBackend.CLASSROOM, start),
            );

            jest.useFakeTimers({ now: new Date('2026-03-30T18:29:59.999Z') });
            await expect(
                service.switchToInhouse('cohort-1', 'admin-1'),
            ).resolves.toMatchObject({ created: 3, updated: 0 });

            jest.resetAllMocks();
            dbTransactionService.execute.mockImplementation(
                async (cb: (m: unknown) => unknown) => cb(manager),
            );
            cohortRepository.findOne.mockResolvedValue(
                seedableCohort(AssignmentBackend.CLASSROOM, start),
            );
            cohortsConfigService.getConfig.mockReturnValue(fullConfig);
            jest.setSystemTime(new Date('2026-03-30T18:30:00.000Z'));
            await expect(
                service.switchToInhouse('cohort-1', 'admin-1'),
            ).rejects.toThrow('graduated');
            expectNoWrites();
        });

        it('400s, listing the weeks, when the config has no assignment for an exercise week', async () => {
            cohortRepository.findOne.mockResolvedValue(
                seedableCohort(AssignmentBackend.CLASSROOM, midway()),
            );
            cohortsConfigService.getConfig.mockReturnValue(partialConfig);

            const attempt = service.switchToInhouse('cohort-1', 'admin-1');

            await expect(attempt).rejects.toBeInstanceOf(BadRequestException);
            await expect(attempt).rejects.toThrow('exercise week(s) 3');
            expectNoWrites();
        });

        it('409s, listing the weeks, when an assignment would open already past its deadline', async () => {
            // Week 1 was two weeks ago; due three days after it.
            cohortRepository.findOne.mockResolvedValue(
                seedableCohort(AssignmentBackend.CLASSROOM, midway()),
            );
            cohortsConfigService.getConfig.mockReturnValue({
                weeks: [
                    {
                        hasExercise: true,
                        assignment: {
                            ...assignmentConfig('pb-week-1'),
                            deadline: undefined,
                            deadlineDaysAfterWeek: 3,
                        },
                    },
                    ...fullConfig.weeks.slice(1),
                ],
            });

            const attempt = service.switchToInhouse('cohort-1', 'admin-1');

            await expect(attempt).rejects.toBeInstanceOf(ConflictException);
            await expect(attempt).rejects.toThrow('week(s) 1 would');
            expectNoWrites();
        });
    });

    describe('handleSendClassroomSwitchEmails', () => {
        const task = {
            data: { cohortId: 'cohort-1' },
        } as APITask<TaskType.SEND_CLASSROOM_SWITCH_EMAILS>;
        const switchedAt = new Date('2026-10-19T09:00:00.000Z');

        beforeEach(() => {
            mailService.getCohortShortName.mockReturnValue('PB');
        });

        it('emails every student, and one failure does not stop the rest', async () => {
            cohortRepository.findOne.mockResolvedValue({
                id: 'cohort-1',
                type: CohortType.PROGRAMMING_BITCOIN,
                season: 3,
                switchedFromClassroomAt: switchedAt,
                memberships: [
                    { user: { id: 'u1', email: 'a@x.org', displayName: 'A' } },
                    { user: { id: 'u2', email: null, displayName: 'B' } },
                    { user: { id: 'u3', email: 'c@x.org', displayName: 'C' } },
                ],
            });
            mailService.sendClassroomSwitchEmail
                .mockRejectedValueOnce(new Error('SMTP down'))
                .mockResolvedValueOnce(undefined);

            await service.handleSendClassroomSwitchEmails(task);

            expect(mailService.sendClassroomSwitchEmail).toHaveBeenCalledTimes(
                2,
            );
            expect(
                mailService.sendClassroomSwitchEmail,
            ).toHaveBeenLastCalledWith(
                'c@x.org',
                'C',
                'PB',
                'Season 03',
                switchedAt,
            );
        });

        it('refuses for a cohort that never switched', async () => {
            cohortRepository.findOne.mockResolvedValue({
                id: 'cohort-1',
                switchedFromClassroomAt: null,
                memberships: [],
            });

            await expect(
                service.handleSendClassroomSwitchEmails(task),
            ).rejects.toThrow('has not switched');
            expect(mailService.sendClassroomSwitchEmail).not.toHaveBeenCalled();
        });
    });

    describe('listAssignments', () => {
        it('buckets each enrolled submission once and ignores staff trial runs', async () => {
            const cohort = { id: 'c1', type: 'x', season: 1 };
            const assignment = {
                id: 'a1',
                cohortWeek: { week: 1, cohort },
                isPastDeadline: () => false,
                isOpenForSubmission: () => true,
            };
            const sub = (userId: string, o: object) => ({
                assignment: { id: 'a1' },
                user: { id: userId },
                bestRun: null,
                latestRun: null,
                isPassingOverride: null,
                provisionStatus: ProvisionStatus.READY,
                ...o,
            });
            assignmentRepository.find.mockResolvedValue([assignment]);
            submissionRepository.find.mockResolvedValue([
                sub('u1', { bestRun: { id: 'r' } }),
                sub('u2', { latestRun: { id: 'r' } }),
                sub('u3', {}),
                sub('u4', { provisionStatus: ProvisionStatus.FAILED }),
                sub('u5', { isPassingOverride: true }),
                sub('staff', { bestRun: { id: 'r' } }),
            ]);
            const memberships = [
                ...['u1', 'u2', 'u3', 'u4', 'u5', 'u6'].map((id) => ({
                    cohort,
                    user: { id, role: UserRole.STUDENT },
                })),
                // A TA enrolled in the cohort is neither counted nor tallied.
                { cohort, user: { id: 'staff', role: UserRole.ADMIN } },
            ];
            // Filters on role the way the query's WHERE does.
            membershipRepository.find.mockImplementation(
                async ({ where }: { where: { user: { role: UserRole } } }) =>
                    memberships.filter((m) => m.user.role === where.user.role),
            );

            const [row] = await service.listAssignments();

            expect(row).toMatchObject({
                enrolledCount: 6,
                submissionCount: 5,
                passedCount: 2,
                failingCount: 1,
                inProgressCount: 1,
                failedProvisionCount: 1,
                notStartedCount: 1,
            });
        });
    });

    describe('regrade', () => {
        const inCohort = (id: string) =>
            ({ id, cohortWeek: { cohort: { id: 'cohort-1' } } }) as Assignment;
        const enrolled = (...userIds: string[]) =>
            membershipRepository.find.mockResolvedValue(
                userIds.map((id) => ({
                    cohort: { id: 'cohort-1' },
                    user: { id },
                })),
            );
        // A READY submission with work beyond the template, graded rather
        // than pinned: what a re-grade exists for, unless a test says otherwise.
        const by = (
            userId: string,
            id = userId,
            bestRun: object | null = null,
            overrides: Partial<AssignmentSubmission> = {},
        ) =>
            Object.assign(new AssignmentSubmission(), {
                id,
                user: { id: userId },
                bestRun,
                provisionStatus: ProvisionStatus.READY,
                initialCommitSha: 'a'.repeat(40),
                lastCommitSha: 'b'.repeat(40),
                isPassingOverride: null,
                ...overrides,
            });

        it('re-grades only submissions that have not passed, against the assignment it loaded', async () => {
            const assignment = inCohort('assignment-1');
            assignmentRepository.findOne.mockResolvedValue(assignment);
            enrolled('s1', 's2', 's3');
            submissionRepository.find.mockResolvedValue([
                by('s1', 'passed', { id: 'run-0' }),
                by('s2', 'eligible'),
                by('s3', 'nothing-eligible'),
            ]);
            runsService.dispatchRegrade.mockImplementation(
                async (submission: { id: string }) =>
                    submission.id === 'eligible' ? { id: 'run-1' } : null,
            );

            const result = await service.regrade('assignment-1', staff);

            // A pass is never replaced, so the passed submission is not re-run.
            expect(runsService.dispatchRegrade).toHaveBeenCalledTimes(2);
            expect(runsService.dispatchRegrade).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'eligible' }),
                assignment,
                staff,
            );
            expect(result).toEqual({ dispatched: 1, skipped: 2 });
        });

        it('counts a failed dispatch as skipped rather than aborting the rest', async () => {
            assignmentRepository.findOne.mockResolvedValue(inCohort('a'));
            enrolled('s1', 's2');
            submissionRepository.find.mockResolvedValue([
                by('s1', 'broken'),
                by('s2', 'fine'),
            ]);
            runsService.dispatchRegrade
                .mockRejectedValueOnce(new Error('GitHub is down'))
                .mockResolvedValueOnce({ id: 'run-1' });

            const result = await service.regrade('a', staff);

            expect(result).toEqual({ dispatched: 1, skipped: 1 });
        });

        it('leaves alone what a re-grade could not change', async () => {
            assignmentRepository.findOne.mockResolvedValue(inCohort('a'));
            enrolled('graded', 'yes', 'no', 'template');
            const submissions = [
                by('graded'),
                // A pin outranks grading, whichever way it points.
                by('yes', 'pinned-yes', null, { isPassingOverride: true }),
                by(
                    'no',
                    'pinned-no',
                    { id: 'run-0' },
                    { isPassingOverride: false },
                ),
                // Nothing beyond the template to grade.
                by('template', 'template', null, {
                    lastCommitSha: 'a'.repeat(40),
                }),
            ];
            submissionRepository.find.mockResolvedValue(submissions);
            runsService.dispatchRegrade.mockResolvedValue({ id: 'run-1' });

            const result = await service.regrade('a', staff);

            expect(runsService.dispatchRegrade).toHaveBeenCalledTimes(1);
            expect(runsService.dispatchRegrade).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'graded' }),
                expect.anything(),
                staff,
            );
            expect(result).toEqual({ dispatched: 1, skipped: 3 });
            // The admin's button counts with the same rule.
            expect(
                new AdminAssignmentResponseDto(
                    Object.assign(new Assignment(), {
                        id: 'a',
                        cohortWeek: {
                            id: 'w',
                            week: 1,
                            cohort: { id: 'cohort-1', type: 'x', season: 1 },
                        },
                    }),
                    submissions,
                    4,
                ).regradableCount,
            ).toBe(1);
        });

        it("re-grades only the cohort's current students", async () => {
            // Staff trying the assignment, and a student since removed, keep
            // their submissions but have no score anyone reads.
            assignmentRepository.findOne.mockResolvedValue(inCohort('a'));
            enrolled('student');
            submissionRepository.find.mockResolvedValue([
                by('student'),
                by('ta'),
                by('withdrawn'),
            ]);
            runsService.dispatchRegrade.mockResolvedValue({ id: 'run-1' });

            const result = await service.regrade('a', staff);

            expect(membershipRepository.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        cohort: { id: 'cohort-1' },
                        user: { role: UserRole.STUDENT },
                    },
                }),
            );
            expect(runsService.dispatchRegrade).toHaveBeenCalledTimes(1);
            expect(runsService.dispatchRegrade).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'student' }),
                expect.anything(),
                staff,
            );
            expect(result).toEqual({ dispatched: 1, skipped: 0 });
        });
    });

    describe('listSubmissions', () => {
        it("lists only the cohort's current students", async () => {
            assignmentRepository.findOne.mockResolvedValue({
                id: 'a',
                cohortWeek: { id: 'week-1', cohort: { id: 'cohort-1' } },
            });
            membershipRepository.find.mockResolvedValue([
                { cohort: { id: 'cohort-1' }, user: { id: 'student' } },
            ]);
            const submission = (id: string, userId: string) =>
                Object.assign(new AssignmentSubmission(), {
                    id,
                    user: { id: userId },
                    acceptedAt: new Date(),
                });
            submissionRepository.find.mockResolvedValue([
                submission('mine', 'student'),
                submission('staff-trial', 'ta'),
            ]);
            exerciseScoreRepository.find.mockResolvedValue([]);

            const listed = await service.listSubmissions('a');

            expect(listed.map((s) => s.id)).toEqual(['mine']);
        });
    });

    describe('reprovision', () => {
        const MINUTE = 60 * 1000;
        const row = (provisionStatus: ProvisionStatus, updatedAgoMs = 0) => ({
            id: 'submission-1',
            provisionStatus,
            updatedAt: new Date(Date.now() - updatedAgoMs),
        });

        it('locks the row while it decides', async () => {
            manager.findOne.mockResolvedValueOnce(row(ProvisionStatus.FAILED));

            await service.reprovision('submission-1');

            expect(manager.findOne).toHaveBeenCalledWith(AssignmentSubmission, {
                where: { id: 'submission-1' },
                lock: { mode: 'pessimistic_write' },
            });
        });

        it('re-queues a failed submission', async () => {
            manager.findOne.mockResolvedValueOnce(row(ProvisionStatus.FAILED));

            await service.reprovision('submission-1');

            expect(manager.update).toHaveBeenCalledWith(
                AssignmentSubmission,
                { id: 'submission-1' },
                {
                    provisionStatus: ProvisionStatus.PENDING,
                    provisionError: null,
                },
            );
            expect(manager.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: TaskType.PROVISION_ASSIGNMENT_REPO,
                    data: { submissionId: 'submission-1' },
                }),
            );
        });

        it('refuses a submission that already has its repository', async () => {
            // Re-adopting the repo would record the student's head as the
            // template commit, which reads as "nothing submitted".
            manager.findOne.mockResolvedValueOnce(row(ProvisionStatus.READY));

            await expect(
                service.reprovision('submission-1'),
            ).rejects.toBeInstanceOf(ConflictException);
            expect(manager.update).not.toHaveBeenCalled();
            expect(manager.save).not.toHaveBeenCalled();
        });

        it('refuses while provisioning is still running', async () => {
            manager.findOne.mockResolvedValueOnce(
                row(ProvisionStatus.PROVISIONING, 2 * MINUTE),
            );

            await expect(
                service.reprovision('submission-1'),
            ).rejects.toBeInstanceOf(ConflictException);
            expect(manager.save).not.toHaveBeenCalled();
        });

        it('recovers a submission whose worker went silent past the lease', async () => {
            // The task processor never re-runs a task that died mid-run, so
            // without this the submission would sit in PROVISIONING forever.
            manager.findOne.mockResolvedValueOnce(
                row(ProvisionStatus.PROVISIONING, 11 * MINUTE),
            );

            await service.reprovision('submission-1');

            expect(manager.save).toHaveBeenCalledTimes(1);
        });

        it('404s for a submission that does not exist', async () => {
            manager.findOne.mockResolvedValueOnce(null);

            await expect(service.reprovision('missing')).rejects.toBeInstanceOf(
                NotFoundException,
            );
        });
    });

    describe('overrideScore', () => {
        const submissionIn = (graduatedDaysAgo: number) => ({
            id: 'submission-1',
            user: { id: 'user-1' },
            assignment: {
                cohortWeek: {
                    id: 'week-1',
                    cohort: {
                        id: 'cohort-1',
                        weeks: [
                            {
                                type: CohortWeekType.GRADUATION,
                                scheduledDate: new Date(
                                    Date.now() - graduatedDaysAgo * 86_400_000,
                                ),
                            },
                        ],
                    },
                },
            },
        });

        beforeEach(() => {
            // Graduation a week ahead.
            submissionRepository.findOne.mockResolvedValue(submissionIn(-7));
            exerciseScoreRepository.exists.mockResolvedValue(true);
        });

        it('stores the pin on the submission and re-syncs the score in one transaction', async () => {
            // Writing ExerciseScore directly would be undone by the next save
            // or run, both of which re-sync it from grading.
            await service.overrideScore('submission-1', { isPassing: true });

            expect(manager.update).toHaveBeenCalledWith(
                AssignmentSubmission,
                { id: 'submission-1' },
                { isPassingOverride: true },
            );
            expect(scoreWriteback.sync).toHaveBeenCalledWith(
                manager,
                'submission-1',
            );
        });

        it('clears a pin with null, handing the field back to grading', async () => {
            await service.overrideScore('submission-1', { isSubmitted: null });

            expect(manager.update).toHaveBeenCalledWith(
                AssignmentSubmission,
                { id: 'submission-1' },
                { isSubmittedOverride: null },
            );
        });

        it('409s on a graduated cohort without storing the pin', async () => {
            // A pin that writeback then declines to apply would show staff an
            // override that changed nothing.
            submissionRepository.findOne.mockResolvedValue(submissionIn(2));

            await expect(
                service.overrideScore('submission-1', { isPassing: false }),
            ).rejects.toThrow('graduated');
            expect(manager.update).not.toHaveBeenCalled();
            expect(scoreWriteback.sync).not.toHaveBeenCalled();
        });

        it('404s when enrollment never seeded a score row', async () => {
            exerciseScoreRepository.exists.mockResolvedValueOnce(false);

            await expect(
                service.overrideScore('submission-1', { isPassing: true }),
            ).rejects.toBeInstanceOf(NotFoundException);
            expect(manager.update).not.toHaveBeenCalled();
            expect(scoreWriteback.sync).not.toHaveBeenCalled();
        });
    });
});
