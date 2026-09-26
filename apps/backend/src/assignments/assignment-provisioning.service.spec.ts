import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AssignmentProvisioningService } from '@/assignments/assignment-provisioning.service';
import { GitHubAppClient } from '@/github-app/client/github-app.client';
import { AssignmentSubmission } from '@/entities/assignment-submission.entity';
import { APITask } from '@/entities/api-task.entity';
import { TaskType } from '@/task-processor/task.enums';
import { ProvisionStatus } from '@/common/enum';

// Two provisioning tasks can exist for one submission — an admin reprovision
// queues a second while the first is pending or running. Only the one that
// claims the row may create the repo, and nothing either of them writes later
// may land on a row it no longer holds.
describe('AssignmentProvisioningService', () => {
    let service: AssignmentProvisioningService;

    const submissionRepository = {
        findOne: jest.fn(),
        update: jest.fn(),
    };
    const gitHubAppClient = {
        getRepo: jest.fn(),
        createRepoFromTemplate: jest.fn(),
        getBranchHead: jest.fn(),
    };

    const submission = {
        id: 'submission-1',
        provisionStatus: ProvisionStatus.PENDING,
        user: { id: 'user-1' },
        assignment: {
            slug: 'pb-week-1-s4',
            templateOwner: 'org',
            templateRepo: 'pb-week-1',
        },
    };
    const repo = {
        owner: 'org',
        name: 'pb-week-1-s4-user-1',
        nodeId: 'R_1',
        defaultBranch: 'main',
    };

    const task = (retryCount = 0) =>
        ({
            data: { submissionId: 'submission-1' },
            retryCount,
            retryLimit: 3,
        }) as unknown as APITask<TaskType.PROVISION_ASSIGNMENT_REPO>;

    const claimCriteria = {
        id: 'submission-1',
        provisionStatus: ProvisionStatus.PROVISIONING,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AssignmentProvisioningService,
                {
                    provide: getRepositoryToken(AssignmentSubmission),
                    useValue: submissionRepository,
                },
                { provide: GitHubAppClient, useValue: gitHubAppClient },
                { provide: ConfigService, useValue: { get: () => 'org' } },
            ],
        }).compile();
        service = module.get(AssignmentProvisioningService);

        submissionRepository.findOne.mockResolvedValue(submission);
    });

    afterEach(() => jest.resetAllMocks());

    it('does nothing when another task already claimed the submission', async () => {
        submissionRepository.update.mockResolvedValueOnce({ affected: 0 });

        await service.handleProvisionAssignmentRepo(task());

        expect(submissionRepository.update).toHaveBeenCalledWith(
            { id: 'submission-1', provisionStatus: ProvisionStatus.PENDING },
            { provisionStatus: ProvisionStatus.PROVISIONING },
        );
        expect(gitHubAppClient.getRepo).not.toHaveBeenCalled();
        expect(gitHubAppClient.createRepoFromTemplate).not.toHaveBeenCalled();
    });

    it('creates the repo once it holds the claim, and records it only while still holding it', async () => {
        submissionRepository.update.mockResolvedValue({ affected: 1 });
        gitHubAppClient.getRepo.mockResolvedValueOnce(null);
        gitHubAppClient.createRepoFromTemplate.mockResolvedValueOnce(repo);
        gitHubAppClient.getBranchHead.mockResolvedValueOnce('b'.repeat(40));

        await service.handleProvisionAssignmentRepo(task());

        expect(gitHubAppClient.createRepoFromTemplate).toHaveBeenCalledTimes(1);
        expect(submissionRepository.update).toHaveBeenLastCalledWith(
            claimCriteria,
            expect.objectContaining({
                provisionStatus: ProvisionStatus.READY,
                initialCommitSha: 'b'.repeat(40),
            }),
        );
    });

    it('hands a failed attempt back for retry only while still holding the claim', async () => {
        submissionRepository.update.mockResolvedValue({ affected: 1 });
        gitHubAppClient.getRepo.mockRejectedValueOnce(new Error('GitHub 502'));

        await expect(
            service.handleProvisionAssignmentRepo(task(0)),
        ).rejects.toThrow('GitHub 502');

        expect(submissionRepository.update).toHaveBeenLastCalledWith(
            claimCriteria,
            { provisionStatus: ProvisionStatus.PENDING },
        );
    });

    it('marks the submission failed on the last retry, only while still holding the claim', async () => {
        submissionRepository.update.mockResolvedValue({ affected: 1 });
        gitHubAppClient.getRepo.mockRejectedValueOnce(new Error('GitHub 502'));

        await expect(
            service.handleProvisionAssignmentRepo(task(2)),
        ).rejects.toThrow('GitHub 502');

        expect(submissionRepository.update).toHaveBeenLastCalledWith(
            claimCriteria,
            {
                provisionStatus: ProvisionStatus.FAILED,
                provisionError: 'GitHub 502',
            },
        );
    });
});
