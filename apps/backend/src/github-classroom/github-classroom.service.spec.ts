import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GitHubClassroomService } from '@/github-classroom/github-classroom.service';
import { GitHubClassroomClient } from '@/github-classroom/client/github-classroom.client';
import { APITask } from '@/entities/api-task.entity';
import { Cohort } from '@/entities/cohort.entity';
import { CohortWeek } from '@/entities/cohort-week.entity';
import { ExerciseScore } from '@/entities/exercise-score.entity';
import { User } from '@/entities/user.entity';
import { TaskType } from '@/task-processor/task.enums';
import { AssignmentBackend } from '@/common/enum';

describe('GitHubClassroomService', () => {
    let service: GitHubClassroomService;

    const apiTaskRepository = {
        create: jest.fn((task: unknown) => task),
        save: jest.fn(),
    };
    const cohortRepository = { findOne: jest.fn(), exists: jest.fn() };
    const cohortWeekRepository = { update: jest.fn() };
    const exerciseScoreRepository = { find: jest.fn(), save: jest.fn() };
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
                    provide: getRepositoryToken(CohortWeek),
                    useValue: cohortWeekRepository,
                },
                {
                    provide: getRepositoryToken(ExerciseScore),
                    useValue: exerciseScoreRepository,
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
    });

    afterEach(() => jest.resetAllMocks());

    /** A cohort whose only week ends `endsInDays` from now (negative: ended). */
    function cohort(
        assignmentBackend: AssignmentBackend,
        endsInDays: number,
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
                    classroomAssignmentId: '42',
                    scheduledDate: new Date(Date.now() + endsInDays * DAY_MS),
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
        expect(cohortWeekRepository.update).not.toHaveBeenCalled();
        expect(exerciseScoreRepository.save).not.toHaveBeenCalled();
        expect(apiTaskRepository.save).not.toHaveBeenCalled();
    });

    it('does not reschedule a cohort switched to in-house while its sync was running', async () => {
        // Loaded as CLASSROOM; the switch commits before the reschedule.
        cohortRepository.findOne.mockResolvedValue(
            cohort(AssignmentBackend.CLASSROOM, 30),
        );
        exerciseScoreRepository.find.mockResolvedValue([storedScore()]);
        cohortRepository.exists.mockResolvedValue(false);

        await service.handleSyncClassroomTask(task());

        expect(cohortRepository.exists).toHaveBeenCalledWith({
            where: {
                id: 'cohort-1',
                assignmentBackend: AssignmentBackend.CLASSROOM,
            },
        });
        expect(apiTaskRepository.save).not.toHaveBeenCalled();
    });

    it('keeps syncing and rescheduling an active Classroom cohort', async () => {
        cohortRepository.findOne.mockResolvedValue(
            cohort(AssignmentBackend.CLASSROOM, 30),
        );
        exerciseScoreRepository.find.mockResolvedValue([storedScore()]);
        cohortRepository.exists.mockResolvedValue(true);

        await service.handleSyncClassroomTask(task());

        expect(exerciseScoreRepository.save).toHaveBeenCalledTimes(1);
        expect(apiTaskRepository.save).toHaveBeenCalledWith(
            expect.objectContaining({
                type: TaskType.SYNC_CLASSROOM_SCORES,
                data: { cohortId: 'cohort-1' },
            }),
        );
    });

    it('syncs a graduated Classroom cohort exactly as before: same writes, no reschedule', async () => {
        cohortRepository.findOne.mockResolvedValue(
            cohort(AssignmentBackend.CLASSROOM, -30),
        );
        exerciseScoreRepository.find.mockResolvedValue([storedScore()]);

        await service.handleSyncClassroomTask(task());

        expect(cohortWeekRepository.update).toHaveBeenCalledWith('week-1', {
            classroomInviteLink: 'https://classroom.github.com/a/invite',
            classroomAssignmentUrl:
                'https://classroom.github.com/classrooms/1/assignments/week-1',
        });
        expect(exerciseScoreRepository.save).toHaveBeenCalledWith([
            expect.objectContaining({
                id: 'score-1',
                isSubmitted: true,
                isPassing: true,
                classroomRepositoryUrl: 'https://github.com/org/week-1-alice',
            }),
        ]);
        // Ended: the recurrence stops without consulting the backend flag.
        expect(cohortRepository.exists).not.toHaveBeenCalled();
        expect(apiTaskRepository.save).not.toHaveBeenCalled();
    });

    it('still reschedules a Classroom cohort after its last failed retry', async () => {
        cohortRepository.findOne.mockRejectedValue(
            new Error('connection reset'),
        );
        cohortRepository.exists.mockResolvedValue(true);

        await expect(
            service.handleSyncClassroomTask({
                ...task(),
                retryCount: 2,
            } as APITask<TaskType.SYNC_CLASSROOM_SCORES>),
        ).rejects.toThrow('connection reset');

        expect(apiTaskRepository.save).toHaveBeenCalledTimes(1);
    });
});
