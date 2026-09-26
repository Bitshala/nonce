import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AdminAssignmentsService } from '@/assignments/admin-assignments.service';
import { RunsService } from '@/assignments/runs.service';
import { CohortsConfigService } from '@/cohorts/cohorts.config.service';
import { DbTransactionService } from '@/db-transaction/db-transaction.service';
import { GitHubAppClient } from '@/github-app/client/github-app.client';
import { Assignment } from '@/entities/assignment.entity';
import { AssignmentSubmission } from '@/entities/assignment-submission.entity';
import { Cohort } from '@/entities/cohort.entity';
import { ExerciseScore } from '@/entities/exercise-score.entity';
import { User } from '@/entities/user.entity';

describe('AdminAssignmentsService', () => {
    let service: AdminAssignmentsService;

    const assignmentRepository = { findOne: jest.fn() };
    const submissionRepository = { find: jest.fn() };
    const runsService = { dispatchRegrade: jest.fn() };

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
                { provide: getRepositoryToken(Cohort), useValue: {} },
                { provide: getRepositoryToken(ExerciseScore), useValue: {} },
                { provide: CohortsConfigService, useValue: {} },
                { provide: GitHubAppClient, useValue: {} },
                { provide: RunsService, useValue: runsService },
                { provide: DbTransactionService, useValue: {} },
                { provide: ConfigService, useValue: { get: () => undefined } },
            ],
        }).compile();
        service = module.get(AdminAssignmentsService);
    });

    afterEach(() => jest.resetAllMocks());

    describe('regrade', () => {
        it('re-grades only submissions that have not passed, against the assignment it loaded', async () => {
            const assignment = { id: 'assignment-1' } as Assignment;
            assignmentRepository.findOne.mockResolvedValue(assignment);
            submissionRepository.find.mockResolvedValue([
                { id: 'passed', bestRun: { id: 'run-0' } },
                { id: 'eligible', bestRun: null },
                { id: 'nothing-eligible', bestRun: null },
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
            assignmentRepository.findOne.mockResolvedValue({ id: 'a' });
            submissionRepository.find.mockResolvedValue([
                { id: 'broken', bestRun: null },
                { id: 'fine', bestRun: null },
            ]);
            runsService.dispatchRegrade
                .mockRejectedValueOnce(new Error('GitHub is down'))
                .mockResolvedValueOnce({ id: 'run-1' });

            const result = await service.regrade('a', staff);

            expect(result).toEqual({ dispatched: 1, skipped: 1 });
        });
    });
});
