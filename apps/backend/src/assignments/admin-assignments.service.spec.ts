import { ConflictException, NotFoundException } from '@nestjs/common';
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
import { TaskType } from '@/task-processor/task.enums';
import { ProvisionStatus } from '@/common/enum';

describe('AdminAssignmentsService', () => {
    let service: AdminAssignmentsService;

    const assignmentRepository = { findOne: jest.fn() };
    const submissionRepository = { find: jest.fn() };
    const runsService = { dispatchRegrade: jest.fn() };
    const manager = {
        findOne: jest.fn(),
        update: jest.fn(),
        save: jest.fn(),
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
                { provide: getRepositoryToken(Cohort), useValue: {} },
                { provide: getRepositoryToken(ExerciseScore), useValue: {} },
                { provide: CohortsConfigService, useValue: {} },
                { provide: GitHubAppClient, useValue: {} },
                { provide: RunsService, useValue: runsService },
                {
                    provide: DbTransactionService,
                    useValue: dbTransactionService,
                },
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
});
