import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { AssignmentSubmission } from '@/entities/assignment-submission.entity';
import { APITask } from '@/entities/api-task.entity';
import { TaskType } from '@/task-processor/task.enums';
import { GitHubAppClient } from '@/github-app/client/github-app.client';
import { ProvisionStatus } from '@/common/enum';
import { ServiceError } from '@/common/errors';
import { isLastRetry } from '@/task-processor/task-processor.utils';

/** Template instantiation is not instant; the first commit shows up shortly after. */
const REPO_READY_POLL_ATTEMPTS = 10;
const REPO_READY_POLL_INTERVAL_MS = 1500;

/**
 * Creates the private, org-owned repository behind one submission.
 *
 * No org invitation, no collaborator grant, and no invitation to chase: the
 * student never gets access. Provisioning is a single template instantiation,
 * which is also why it is cheap to retry.
 */
@Injectable()
export class AssignmentProvisioningService {
    private readonly logger = new Logger(AssignmentProvisioningService.name);
    private readonly org: string;

    constructor(
        @InjectRepository(AssignmentSubmission)
        private readonly submissionRepository: Repository<AssignmentSubmission>,
        private readonly gitHubAppClient: GitHubAppClient,
        configService: ConfigService,
    ) {
        this.org = configService.get<string>('githubApp.org') ?? '';
    }

    async handleProvisionAssignmentRepo(
        task: APITask<TaskType.PROVISION_ASSIGNMENT_REPO>,
    ): Promise<void> {
        const { submissionId } = task.data;

        const submission = await this.submissionRepository.findOne({
            where: { id: submissionId },
            relations: { assignment: true, user: true },
        });
        if (!submission) {
            // The submission was deleted after the task was queued. Nothing to
            // provision, and retrying will never help.
            this.logger.warn(
                `Submission ${submissionId} no longer exists; skipping provisioning`,
            );
            return;
        }
        if (submission.provisionStatus === ProvisionStatus.READY) return;

        try {
            await this.submissionRepository.update(
                { id: submission.id },
                { provisionStatus: ProvisionStatus.PROVISIONING },
            );
            await this.provision(submission);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error);

            // Only give up once retries are exhausted; a transient GitHub error
            // should not strand a student with a FAILED submission.
            if (isLastRetry(task)) {
                await this.submissionRepository.update(
                    { id: submission.id },
                    {
                        provisionStatus: ProvisionStatus.FAILED,
                        provisionError: message,
                    },
                );
            } else {
                await this.submissionRepository.update(
                    { id: submission.id },
                    { provisionStatus: ProvisionStatus.PENDING },
                );
            }
            throw error;
        }
    }

    private async provision(submission: AssignmentSubmission): Promise<void> {
        const assignment = submission.assignment;
        // The slug already carries the cohort season, so this stays unique even
        // when a student retakes the same cohort.
        const name = `${assignment.slug}-${submission.user.id}`;

        // Check-then-create, so a retry after a partial failure converges on the
        // existing repo instead of creating a second one.
        let repo = await this.gitHubAppClient.getRepo(this.org, name);
        if (repo) {
            this.logger.log(
                `Repo ${this.org}/${name} already exists; adopting it`,
            );
        } else {
            this.logger.log(`Creating repo ${this.org}/${name}`);
            repo = await this.gitHubAppClient.createRepoFromTemplate({
                templateOwner: assignment.templateOwner,
                templateRepo: assignment.templateRepo,
                owner: this.org,
                name,
                description: `Assignment ${assignment.slug}`,
            });
        }

        // Generation is asynchronous on GitHub's side: the repo exists before
        // its first commit does.
        const initialCommitSha = await this.waitForInitialCommit(
            repo.owner,
            repo.name,
            repo.defaultBranch,
        );

        await this.submissionRepository.update(
            { id: submission.id },
            {
                repoOwner: repo.owner,
                repoName: repo.name,
                repoNodeId: repo.nodeId,
                defaultBranch: repo.defaultBranch,
                initialCommitSha,
                lastCommitSha: initialCommitSha,
                provisionStatus: ProvisionStatus.READY,
                provisionError: null,
            },
        );

        this.logger.log(
            `Provisioned ${repo.owner}/${repo.name} for submission ${submission.id}`,
        );
    }

    private async waitForInitialCommit(
        owner: string,
        repo: string,
        branch: string,
    ): Promise<string> {
        for (let attempt = 0; attempt < REPO_READY_POLL_ATTEMPTS; attempt++) {
            const head = await this.gitHubAppClient.getBranchHead(
                owner,
                repo,
                branch,
            );
            if (head) return head;
            await sleep(REPO_READY_POLL_INTERVAL_MS);
        }

        throw new ServiceError(
            `Repo ${owner}/${repo} has no commit on ${branch} after template generation`,
        );
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
