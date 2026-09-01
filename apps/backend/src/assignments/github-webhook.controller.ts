import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
    Body,
    Controller,
    Headers,
    HttpCode,
    HttpStatus,
    Inject,
    Logger,
    Post,
    UseGuards,
} from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Cache } from 'cache-manager';
import { Public } from '@/auth/public-route.decorator';
import { GitHubWebhookGuard } from '@/assignments/github-webhook.guard';
import { RunsService } from '@/assignments/runs.service';
import { CIRunJob } from '@/entities/ci-run.entity';

/** Long enough to cover GitHub's redelivery window. */
const DELIVERY_DEDUPE_TTL_MS = 10 * 60 * 1000;

interface WorkflowRunPayload {
    action?: string;
    workflow_run?: {
        id: number;
        run_attempt?: number | null;
        status: string | null;
        conclusion: string | null;
        display_title: string;
        html_url: string;
        created_at: string;
        run_started_at?: string | null;
        updated_at: string;
    };
}

interface WorkflowJobPayload {
    workflow_job?: {
        id: number;
        run_id: number;
        name: string;
        status: string;
        conclusion: string | null;
        started_at?: string | null;
        completed_at?: string | null;
        steps?: {
            name: string;
            status: string;
            conclusion: string | null;
            number: number;
        }[];
    };
}

/**
 * Inbound GitHub events. Public by necessity — GitHub holds no session — and
 * authenticated instead by the HMAC signature guard.
 *
 * Deliberately no `@Roles()`: `RolesGuard` dereferences `user.role`, which is
 * undefined on an anonymous request.
 */
@Public()
@SkipThrottle()
@UseGuards(GitHubWebhookGuard)
@Controller('webhooks')
export class GitHubWebhookController {
    private readonly logger = new Logger(GitHubWebhookController.name);

    constructor(
        private readonly runsService: RunsService,
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    ) {}

    @Post('github')
    // GitHub gives up after 10 seconds, so acknowledge first and do the work
    // after. A slow handler would otherwise turn into a redelivery storm.
    @HttpCode(HttpStatus.ACCEPTED)
    @ApiExcludeEndpoint()
    async receive(
        @Headers('x-github-event') event: string,
        @Headers('x-github-delivery') deliveryId: string,
        @Body() payload: WorkflowRunPayload & WorkflowJobPayload,
    ): Promise<{ accepted: boolean }> {
        if (deliveryId) {
            const key = `webhook:delivery:${deliveryId}`;
            if (await this.cacheManager.get(key)) {
                return { accepted: true };
            }
            await this.cacheManager.set(key, 1, DELIVERY_DEDUPE_TTL_MS);
        }

        void this.process(event, payload).catch((error) => {
            this.logger.error(
                `Failed handling ${event} delivery ${deliveryId}: ${error instanceof Error ? error.message : error}`,
            );
        });

        return { accepted: true };
    }

    private async process(
        event: string,
        payload: WorkflowRunPayload & WorkflowJobPayload,
    ): Promise<void> {
        if (event === 'workflow_run') {
            await this.handleWorkflowRun(payload);
            return;
        }
        if (event === 'workflow_job') {
            await this.handleWorkflowJob(payload);
        }
    }

    private async handleWorkflowRun(
        payload: WorkflowRunPayload,
    ): Promise<void> {
        const remote = payload.workflow_run;
        if (!remote) return;

        // The run name carries the correlation token, which is the only link
        // back to our row: workflow_dispatch returns no run id.
        const token = remote.display_title.startsWith('grade-')
            ? remote.display_title.slice('grade-'.length)
            : null;

        const run = token
            ? await this.runsService.findRunByCorrelationToken(token)
            : await this.runsService.findRunByGithubRunId(remote.id);
        if (!run || run.isTerminal) return;

        await this.runsService.applyRunState(run, {
            id: remote.id,
            runAttempt: remote.run_attempt ?? 1,
            status: remote.status,
            conclusion: remote.conclusion,
            displayTitle: remote.display_title,
            htmlUrl: remote.html_url,
            createdAt: remote.created_at,
            runStartedAt: remote.run_started_at ?? null,
            updatedAt: remote.updated_at,
        });
    }

    private async handleWorkflowJob(
        payload: WorkflowJobPayload,
    ): Promise<void> {
        const job = payload.workflow_job;
        if (!job) return;

        const run = await this.runsService.findRunByGithubRunId(job.run_id);
        if (!run) return;

        const incoming: CIRunJob = {
            id: job.id,
            name: job.name,
            status: job.status,
            conclusion: job.conclusion ?? null,
            startedAt: job.started_at ?? null,
            completedAt: job.completed_at ?? null,
            steps: job.steps ?? [],
        };

        const jobs = [...(run.jobs ?? [])];
        const index = jobs.findIndex((candidate) => candidate.id === job.id);
        if (index >= 0) jobs[index] = incoming;
        else jobs.push(incoming);

        await this.runsService.updateJobs(run.id, jobs);
    }
}
