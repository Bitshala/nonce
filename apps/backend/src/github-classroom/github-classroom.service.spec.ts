import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GitHubClassroomService } from '@/github-classroom/github-classroom.service';
import { GitHubClassroomClient } from '@/github-classroom/client/github-classroom.client';
import { APITask } from '@/entities/api-task.entity';
import { Cohort } from '@/entities/cohort.entity';
import { ExerciseScore } from '@/entities/exercise-score.entity';
import { User } from '@/entities/user.entity';
import { TaskType } from '@/task-processor/task.enums';
import { AssignmentBackend, CohortWeekType } from '@/common/enum';
import { DbTransactionService } from '@/db-transaction/db-transaction.service';
import { ServiceError } from '@/common/errors';

describe('GitHubClassroomService', () => {
    let service: GitHubClassroomService;

    const apiTaskRepository = {
        create: jest.fn((task: unknown) => task),
        save: jest.fn(),
    };
    const cohortRepository = { findOne: jest.fn() };
    // Scores and week links are written through the transaction's manager;
    // findOne is the backend re-read under the cohort row lock.
    const manager = {
        findOne: jest.fn(),
        find: jest.fn(),
        update: jest.fn(),
        save: jest.fn(),
    };
    const dbTransactionService = {
        execute: jest.fn(async (cb: (m: unknown) => unknown) => cb(manager)),
    };
    const githubClassroomClient = {
        getAssignment: jest.fn(),
        fetchAcceptedAssignments: jest.fn(),
    };

    const DAY_MS = 24 * 60 * 60 * 1000;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GitHubClassroomService,
                {
                    provide: getRepositoryToken(APITask),
                    useValue: apiTaskRepository,
                },
                {
                    provide: getRepositoryToken(Cohort),
                    useValue: cohortRepository,
                },
                {
                    provide: DbTransactionService,
                    useValue: dbTransactionService,
                },
                {
                    provide: GitHubClassroomClient,
                    useValue: githubClassroomClient,
                },
            ],
        }).compile();
        service = module.get(GitHubClassroomService);

        githubClassroomClient.getAssignment.mockResolvedValue({
            invite_link: 'https://classroom.github.com/a/invite',
            classroom: { url: 'https://classroom.github.com/classrooms/1' },
            slug: 'week-1',
        });
        githubClassroomClient.fetchAcceptedAssignments.mockResolvedValue([
            {
                students: [{ login: 'Alice' }],
                commit_count: 3,
                passing: true,
                repository: { html_url: 'https://github.com/org/week-1-alice' },
            },
        ]);
        apiTaskRepository.create.mockImplementation((task: unknown) => task);
        dbTransactionService.execute.mockImplementation(
            async (cb: (m: unknown) => unknown) => cb(manager),
        );
        manager.findOne.mockResolvedValue({
            id: 'cohort-1',
            assignmentBackend: AssignmentBackend.CLASSROOM,
        });
    });

    afterEach(() => jest.resetAllMocks());

    /**
     * A cohort with one Classroom-graded week and a graduation week
     * `graduatesInDays` from now (negative: graduated), or exactly at
     * `graduationDate` when given.
     */
    function cohort(
        assignmentBackend: AssignmentBackend,
        graduatesInDays: number,
        graduationDate?: Date,
    ): Cohort {
        return Object.assign(new Cohort(), {
            id: 'cohort-1',
            classroomId: '243620',
            assignmentBackend,
            memberships: [
                {
                    user: {
                        id: 'user-1',
                        githubProfileUrl: 'https://github.com/alice',
                    },
                },
            ],
            weeks: [
                {
                    id: 'week-1',
                    type: CohortWeekType.GROUP_DISCUSSION,
                    classroomAssignmentId: '42',
                    scheduledDate: new Date(
                        Date.now() + (graduatesInDays - 7) * DAY_MS,
                    ),
                },
                {
                    id: 'graduation',
                    type: CohortWeekType.GRADUATION,
                    classroomAssignmentId: null,
                    scheduledDate:
                        graduationDate ??
                        new Date(Date.now() + graduatesInDays * DAY_MS),
                },
            ],
        });
    }

    function task(): APITask<TaskType.SYNC_CLASSROOM_SCORES> {
        return {
            data: { cohortId: 'cohort-1' },
            retryCount: 0,
            retryLimit: 3,
        } as APITask<TaskType.SYNC_CLASSROOM_SCORES>;
    }

    function storedScore(): ExerciseScore {
        return Object.assign(new ExerciseScore(), {
            id: 'score-1',
            user: { id: 'user-1' } as User,
            isSubmitted: false,
            isPassing: false,
            classroomRepositoryUrl: null,
        });
    }

    it('leaves a cohort that is not on GitHub Classroom alone, and stops the recurrence', async () => {
        cohortRepository.findOne.mockResolvedValue(
            cohort(AssignmentBackend.INHOUSE, 30),
        );

        await service.handleSyncClassroomTask(task());

        expect(githubClassroomClient.getAssignment).not.toHaveBeenCalled();
        expect(manager.update).not.toHaveBeenCalled();
        expect(manager.save).not.toHaveBeenCalled();
        expect(apiTaskRepository.save).not.toHaveBeenCalled();
    });

    it('does not reschedule a cohort switched to in-house while its sync was running', async () => {
        // Loaded as CLASSROOM; the switch commits before the reschedule, so
        // the re-read (filtered on CLASSROOM) finds nothing.
        cohortRepository.findOne
            .mockResolvedValueOnce(cohort(AssignmentBackend.CLASSROOM, 30))
            .mockResolvedValueOnce(null);
        manager.find.mockResolvedValue([storedScore()]);

        await service.handleSyncClassroomTask(task());

        expect(cohortRepository.findOne).toHaveBeenLastCalledWith({
            where: {
                id: 'cohort-1',
                assignmentBackend: AssignmentBackend.CLASSROOM,
            },
            relations: { weeks: true },
        });
        expect(apiTaskRepository.save).not.toHaveBeenCalled();
    });

    it('writes nothing if the cohort switched while Classroom was being read', async () => {
        // Loaded as CLASSROOM, but by the time the results are applied the
        // switch has committed: the re-read under the lock sees INHOUSE.
        cohortRepository.findOne.mockResolvedValue(
            cohort(AssignmentBackend.CLASSROOM, 30),
        );
        manager.find.mockResolvedValue([storedScore()]);
        manager.findOne.mockResolvedValue({
            id: 'cohort-1',
            assignmentBackend: AssignmentBackend.INHOUSE,
        });

        await service.handleSyncClassroomTask(task());

        expect(manager.findOne).toHaveBeenCalledWith(Cohort, {
            where: { id: 'cohort-1' },
            lock: { mode: 'for_no_key_update' },
        });
        expect(manager.save).not.toHaveBeenCalled();
        expect(manager.update).not.toHaveBeenCalled();
        expect(apiTaskRepository.save).not.toHaveBeenCalled();
    });

    it('applies the results only after the network reads finish', async () => {
        // Reads inside the transaction would hold the cohort lock for minutes.
        cohortRepository.findOne.mockResolvedValue(
            cohort(AssignmentBackend.CLASSROOM, 30),
        );
        manager.find.mockResolvedValue([storedScore()]);

        await service.handleSyncClassroomTask(task());

        expect(
            githubClassroomClient.fetchAcceptedAssignments.mock
                .invocationCallOrder[0],
        ).toBeLessThan(
            dbTransactionService.execute.mock.invocationCallOrder[0],
        );
    });

    it('keeps syncing and rescheduling an active Classroom cohort', async () => {
        cohortRepository.findOne.mockResolvedValue(
            cohort(AssignmentBackend.CLASSROOM, 30),
        );
        manager.find.mockResolvedValue([storedScore()]);

        await service.handleSyncClassroomTask(task());

        expect(manager.save).toHaveBeenCalledTimes(1);
        expect(apiTaskRepository.save).toHaveBeenCalledWith(
            expect.objectContaining({
                type: TaskType.SYNC_CLASSROOM_SCORES,
                data: { cohortId: 'cohort-1' },
            }),
        );
    });

    describe('graduated cohorts are frozen', () => {
        afterEach(() => jest.useRealTimers());

        // Graduation on 2026-11-25: scores freeze at 18:29:59.999 UTC, the
        // end of that day in IST.
        const graduation = new Date('2026-11-25T00:00:00.000Z');
        const cutoff = new Date('2026-11-25T18:29:59.999Z');

        it('neither syncs nor reschedules a graduated cohort', async () => {
            cohortRepository.findOne.mockResolvedValue(
                cohort(AssignmentBackend.CLASSROOM, -2),
            );

            await service.handleSyncClassroomTask(task());

            expect(githubClassroomClient.getAssignment).not.toHaveBeenCalled();
            expect(dbTransactionService.execute).not.toHaveBeenCalled();
            expect(manager.save).not.toHaveBeenCalled();
            expect(apiTaskRepository.save).not.toHaveBeenCalled();
        });

        it('pulls the last sync forward to just before the cut-off', async () => {
            // Six hours from 14:00 UTC would land after the cut-off.
            jest.useFakeTimers({ now: new Date('2026-11-25T14:00:00.000Z') });
            cohortRepository.findOne.mockResolvedValue(
                cohort(AssignmentBackend.CLASSROOM, 0, graduation),
            );
            manager.find.mockResolvedValue([storedScore()]);

            await service.handleSyncClassroomTask(task());

            expect(apiTaskRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    executeOnTime: new Date(cutoff.getTime() - 15 * 60 * 1000),
                }),
            );
        });

        it('ends the recurrence when no sync could run before the cut-off', async () => {
            jest.useFakeTimers({ now: new Date('2026-11-25T18:20:00.000Z') });
            cohortRepository.findOne.mockResolvedValue(
                cohort(AssignmentBackend.CLASSROOM, 0, graduation),
            );
            manager.find.mockResolvedValue([storedScore()]);

            await service.handleSyncClassroomTask(task());

            // Its own results still land: graduation day is still open.
            expect(manager.save).toHaveBeenCalledTimes(1);
            expect(apiTaskRepository.save).not.toHaveBeenCalled();
        });

        it('discards results if graduation passes while Classroom is read', async () => {
            jest.useFakeTimers({ now: new Date('2026-11-25T18:25:00.000Z') });
            cohortRepository.findOne.mockResolvedValue(
                cohort(AssignmentBackend.CLASSROOM, 0, graduation),
            );
            manager.find.mockResolvedValue([storedScore()]);
            githubClassroomClient.fetchAcceptedAssignments.mockImplementation(
                async () => {
                    jest.setSystemTime(new Date('2026-11-25T18:31:00.000Z'));
                    return [
                        {
                            students: [{ login: 'Alice' }],
                            commit_count: 3,
                            passing: true,
                            repository: {
                                html_url: 'https://github.com/org/week-1-alice',
                            },
                        },
                    ];
                },
            );

            await service.handleSyncClassroomTask(task());

            expect(manager.save).not.toHaveBeenCalled();
            expect(manager.update).not.toHaveBeenCalled();
            expect(apiTaskRepository.save).not.toHaveBeenCalled();
        });
    });

    it('still reschedules a Classroom cohort after its last failed retry', async () => {
        cohortRepository.findOne
            .mockRejectedValueOnce(new Error('connection reset'))
            .mockResolvedValueOnce(cohort(AssignmentBackend.CLASSROOM, 30));

        await expect(
            service.handleSyncClassroomTask({
                ...task(),
                retryCount: 2,
            } as APITask<TaskType.SYNC_CLASSROOM_SCORES>),
        ).rejects.toThrow('connection reset');

        expect(apiTaskRepository.save).toHaveBeenCalledTimes(1);
    });

    describe('final read for the switch to in-house', () => {
        it('fails the whole read if Classroom cannot report a week', async () => {
            // A partial read would freeze that week's stale scores for good.
            cohortRepository.findOne.mockResolvedValue(
                cohort(AssignmentBackend.CLASSROOM, 30),
            );
            githubClassroomClient.fetchAcceptedAssignments.mockRejectedValue(
                new Error('502 Bad Gateway'),
            );

            await expect(
                service.fetchFinalResults('cohort-1'),
            ).rejects.toBeInstanceOf(ServiceError);
        });

        it('writes the fetched results in the caller’s transaction', async () => {
            cohortRepository.findOne.mockResolvedValue(
                cohort(AssignmentBackend.CLASSROOM, 30),
            );
            manager.find.mockResolvedValue([storedScore()]);

            const fetched = await service.fetchFinalResults('cohort-1');
            const written = await service.applyFinalResults(
                manager as never,
                fetched,
            );

            expect(written).toBe(1);
            expect(manager.save).toHaveBeenCalledWith([
                expect.objectContaining({ id: 'score-1', isPassing: true }),
            ]);
            // The caller owns the transaction.
            expect(dbTransactionService.execute).not.toHaveBeenCalled();
        });

        it('refuses rather than skip a matched student with no score row', async () => {
            cohortRepository.findOne.mockResolvedValue(
                cohort(AssignmentBackend.CLASSROOM, 30),
            );
            manager.find.mockResolvedValue([]);

            const fetched = await service.fetchFinalResults('cohort-1');

            await expect(
                service.applyFinalResults(manager as never, fetched),
            ).rejects.toBeInstanceOf(ServiceError);
            expect(manager.save).not.toHaveBeenCalled();
        });
    });
});
