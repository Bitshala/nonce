import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
    ForbiddenException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import type { Cache } from 'cache-manager';
import { randomUUID } from 'crypto';
import AdmZip from 'adm-zip';
import { In, Not, Repository } from 'typeorm';
import { AssignmentSubmission } from '@/entities/assignment-submission.entity';
import { CIRun, CIRunJob, GradingReport } from '@/entities/ci-run.entity';
import { CIRunLog, MAX_LOG_BYTES } from '@/entities/ci-run-log.entity';
import { APITask } from '@/entities/api-task.entity';
import { User } from '@/entities/user.entity';
import { TaskType } from '@/task-processor/task.enums';
import { GitHubAppClient } from '@/github-app/client/github-app.client';
import { WorkflowRunSummary } from '@/github-app/client/response';
import { AssignmentsService } from '@/assignments/assignments.service';
import { SubmissionsService } from '@/assignments/submissions.service';
import { ExerciseScoreWritebackService } from '@/assignments/exercise-score-writeback.service';
import { DbTransactionService } from '@/db-transaction/db-transaction.service';
import { AssignmentStatus, CIRunConclusion, CIRunStatus } from '@/common/enum';
import { ServiceError } from '@/common/errors';
import {
    CIRunDetailResponseDto,
    CIRunLogResponseDto,
    CIRunSummaryResponseDto,
} from '@/assignments/assignments.response.dto';

/**
 * How long to keep looking for the GitHub run a dispatch produced before giving
 * up. `workflow_dispatch` answers 204 with no body, so the run id can only be
 * recovered by matching the correlation token in the run's display title.
 */
const CORRELATION_WINDOW_MS = 60_000;

/** Slack on top of the assignment's own timeout before force-completing. */
const TIMEOUT_GRACE_MS = 5 * 60_000;

/** Backoff for the reconcile recurrence, in seconds, last value repeating. */
const RECONCILE_DELAYS_SECONDS = [5, 5, 10, 10, 20, 30, 60];

/** Suppresses a refresh storm when several tabs poll the same run. */
const REFRESH_COOLDOWN_MS = 3_000;

/** The artifact the grading workflow uploads its report as. */
const REPORT_ARTIFACT_NAME = 'grade-report';
const REPORT_FILE_NAME = 'report.json';

/** Name of the job that executes student code; the one whose logs matter. */
const GRADE_JOB_NAME = 'grade';

/**
 * Dispatching grading runs, correlating them back to GitHub, and turning their
 * results into scores.
 */
@Injectable()
export class RunsService {
    private readonly logger = new Logger(RunsService.name);
    private readonly graderOwner: string;
    private readonly graderRepo: string;
    private readonly graderWorkflowFile: string;

    constructor(
        @InjectRepository(CIRun)
        private readonly ciRunRepository: Repository<CIRun>,
        @InjectRepository(CIRunLog)
        private readonly ciRunLogRepository: Repository<CIRunLog>,
        @InjectRepository(AssignmentSubmission)
        private readonly submissionRepository: Repository<AssignmentSubmission>,
        private readonly gitHubAppClient: GitHubAppClient,
        private readonly assignmentsService: AssignmentsService,
        private readonly submissionsService: SubmissionsService,
        private readonly scoreWriteback: ExerciseScoreWritebackService,
        private readonly dbTransactionService: DbTransactionService,
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
        configService: ConfigService,
    ) {
        const grader = configService.get<string>('githubApp.graderRepo') ?? '';
        const [owner, repo] = grader.split('/');
        this.graderOwner = owner ?? '';
        this.graderRepo = repo ?? '';
        this.graderWorkflowFile =
            configService.get<string>('githubApp.graderWorkflowFile') ??
            'grade.yml';
    }

    async createRun(
        submissionId: string,
        commitSha: string,
        user: User,
    ): Promise<CIRunDetailResponseDto> {
        const submission = await this.submissionsService.loadReadySubmission(
            submissionId,
            user,
        );
        const assignment = submission.assignment;

        if (assignment.status === AssignmentStatus.CLOSED) {
            throw new ForbiddenException('This assignment is closed.');
        }
        if (assignment.isPastDeadline() && !assignment.allowLateSubmission) {
            throw new ForbiddenException(
                'The deadline for this assignment has passed.',
            );
        }

        // Re-pressing Run on a commit that is already grading returns the run in
        // flight rather than burning quota on a duplicate.
        const inFlight = await this.ciRunRepository.findOne({
            where: {
                submission: { id: submission.id },
                commitSha,
                status: Not(In([CIRunStatus.COMPLETED, CIRunStatus.ORPHANED])),
            },
            relations: { submission: true },
        });
        if (inFlight) {
            return this.toDetail(inFlight, submission);
        }

        const runsToday = await this.assignmentsService.countRunsToday(
            submission.id,
        );
        if (runsToday >= assignment.maxRunsPerDay) {
            throw new ForbiddenException(
                `You have used all ${assignment.maxRunsPerDay} runs for today on this assignment.`,
            );
        }

        const correlationToken = randomUUID();
        const run = await this.dbTransactionService.execute(async (manager) => {
            const created = manager.create(CIRun, {
                submission,
                triggeredByUser: user,
                commitSha,
                correlationToken,
                status: CIRunStatus.DISPATCHING,
                dispatchedAt: new Date(),
                // Frozen now: a run started before the deadline still counts
                // even if it finishes after it.
                countsForScore: !assignment.isPastDeadline(),
                jobs: [],
            });
            await manager.save(created);

            await manager.update(
                AssignmentSubmission,
                { id: submission.id },
                { latestRun: { id: created.id } },
            );

            await manager.save(
                this.buildReconcileTask(
                    created.id,
                    0,
                    new APITask<TaskType.RECONCILE_CI_RUN>(),
                ),
            );

            return created;
        });

        await this.gitHubAppClient.dispatchWorkflow({
            owner: this.graderOwner,
            repo: this.graderRepo,
            workflowFile: this.graderWorkflowFile,
            ref: 'main',
            inputs: {
                student_repo: submission.repoFullName ?? '',
                commit_sha: commitSha,
                assignment_slug: assignment.slug,
                test_path: assignment.graderTestPath,
                correlation_token: correlationToken,
                timeout_minutes: String(assignment.runTimeoutMinutes),
            },
        });

        await this.ciRunRepository.update(
            { id: run.id },
            { status: CIRunStatus.QUEUED },
        );
        run.status = CIRunStatus.QUEUED;

        this.logger.log(
            `Dispatched run ${run.id} (${correlationToken}) for submission ${submission.id} @ ${commitSha}`,
        );

        return this.toDetail(run, submission);
    }

    async listRuns(
        submissionId: string,
        user: User,
    ): Promise<CIRunSummaryResponseDto[]> {
        await this.assignmentsService.resolveSubmissionForViewer(
            submissionId,
            user,
        );

        const runs = await this.ciRunRepository.find({
            where: { submission: { id: submissionId } },
            order: { dispatchedAt: 'DESC' },
            take: 50,
        });
        return runs.map((run) => new CIRunSummaryResponseDto(run));
    }

    /**
     * Run detail, refreshing from GitHub on the way out when the run is still
     * live. That is what makes the UI feel responsive without a background
     * poller, and it means we only ever poll a run someone is actually looking
     * at — the lever §9.4 depends on.
     */
    async getRun(runId: string, user: User): Promise<CIRunDetailResponseDto> {
        let run = await this.loadRunForViewer(runId, user);

        if (!run.isTerminal && (await this.claimRefreshSlot(run.id))) {
            await this.refresh(run);
            run = await this.loadRunForViewer(runId, user);
        }

        const hasLogs = await this.ciRunLogRepository.exist({
            where: { ciRun: { id: run.id } },
        });
        return this.toDetail(run, run.submission, hasLogs);
    }

    async getLogs(runId: string, user: User): Promise<CIRunLogResponseDto> {
        const run = await this.loadRunForViewer(runId, user);

        const log = await this.ciRunLogRepository.findOne({
            where: { ciRun: { id: run.id } },
        });
        if (!log) {
            throw new NotFoundException(
                'Logs are not available for this run yet',
            );
        }
        return new CIRunLogResponseDto(log);
    }

    // --- Task handler ----------------------------------------------------

    /**
     * Webhooks are the fast path, not the only path: local development has no
     * public URL and deliveries get dropped. This sweeps anything they missed
     * and self-reschedules until the run is terminal.
     */
    async handleReconcileCIRun(
        task: APITask<TaskType.RECONCILE_CI_RUN>,
    ): Promise<void> {
        const { ciRunId, attempt } = task.data;

        const run = await this.ciRunRepository.findOne({
            where: { id: ciRunId },
            relations: {
                submission: { assignment: { cohortWeek: { cohort: true } } },
            },
        });
        if (!run || run.isTerminal) return;

        await this.refresh(run);

        const refreshed = await this.ciRunRepository.findOne({
            where: { id: ciRunId },
        });
        if (refreshed && !refreshed.isTerminal) {
            await this.ciRunRepository.manager.save(
                this.buildReconcileTask(
                    ciRunId,
                    attempt + 1,
                    new APITask<TaskType.RECONCILE_CI_RUN>(),
                ),
            );
        }
    }

    /**
     * Pulls current state for one run from GitHub and applies it. Shared by the
     * webhook fast path, the reconcile task, and the on-demand refresh in
     * `getRun`, so all three converge on identical behaviour.
     */
    async refresh(run: CIRun): Promise<void> {
        const now = Date.now();
        const age = now - run.dispatchedAt.getTime();

        if (!run.githubRunId) {
            const matched = await this.findRunByToken(run.correlationToken);
            if (matched) {
                await this.ciRunRepository.update(
                    { id: run.id },
                    {
                        githubRunId: String(matched.id),
                        githubRunAttempt: matched.runAttempt,
                    },
                );
                run.githubRunId = String(matched.id);
                await this.applyRunState(run, matched);
                return;
            }

            if (age > CORRELATION_WINDOW_MS) {
                this.logger.warn(
                    `Run ${run.id} never correlated to a GitHub run; marking ORPHANED`,
                );
                await this.ciRunRepository.update(
                    { id: run.id },
                    {
                        status: CIRunStatus.ORPHANED,
                        completedAt: new Date(),
                    },
                );
            }
            return;
        }

        const remote = await this.gitHubAppClient.getWorkflowRun(
            this.graderOwner,
            this.graderRepo,
            Number(run.githubRunId),
        );
        if (!remote) return;

        await this.applyRunState(run, remote);

        // A run GitHub has forgotten about, or one wedged past its own timeout,
        // must not stay live forever.
        const timeoutMs =
            (run.submission?.assignment?.runTimeoutMinutes ?? 10) * 60_000 +
            TIMEOUT_GRACE_MS;
        if (age > timeoutMs) {
            const fresh = await this.ciRunRepository.findOne({
                where: { id: run.id },
            });
            if (fresh && !fresh.isTerminal) {
                this.logger.warn(
                    `Run ${run.id} exceeded its timeout; forcing TIMED_OUT`,
                );
                await this.completeRun(run.id, CIRunConclusion.TIMED_OUT);
            }
        }
    }

    /** Applies a GitHub run summary, ingesting results once it has completed. */
    async applyRunState(run: CIRun, remote: WorkflowRunSummary): Promise<void> {
        const status = mapRunStatus(remote.status);
        const jobs = await this.readJobs(Number(remote.id));

        await this.ciRunRepository.update(
            { id: run.id },
            {
                githubRunId: String(remote.id),
                githubRunAttempt: remote.runAttempt,
                status,
                jobs,
                startedAt: remote.runStartedAt
                    ? new Date(remote.runStartedAt)
                    : null,
            },
        );

        if (status === CIRunStatus.COMPLETED) {
            await this.completeRun(run.id, mapConclusion(remote.conclusion));
        }
    }

    /** Finds the GitHub run whose `run-name` carries our correlation token. */
    async findRunByToken(token: string): Promise<WorkflowRunSummary | null> {
        const expected = `grade-${token}`;
        const runs = await this.gitHubAppClient.listRecentDispatchRuns({
            owner: this.graderOwner,
            repo: this.graderRepo,
            workflowFile: this.graderWorkflowFile,
        });
        return runs.find((run) => run.displayTitle === expected) ?? null;
    }

    async findRunByGithubRunId(githubRunId: number): Promise<CIRun | null> {
        return this.ciRunRepository.findOne({
            where: { githubRunId: String(githubRunId) },
            relations: {
                submission: { assignment: { cohortWeek: { cohort: true } } },
            },
        });
    }

    async findRunByCorrelationToken(token: string): Promise<CIRun | null> {
        return this.ciRunRepository.findOne({
            where: { correlationToken: token },
            relations: {
                submission: { assignment: { cohortWeek: { cohort: true } } },
            },
        });
    }

    async updateJobs(runId: string, jobs: CIRunJob[]): Promise<void> {
        await this.ciRunRepository.update({ id: runId }, { jobs });
    }

    // --- Completion ------------------------------------------------------

    /**
     * Terminal transition: pull the report and logs, then write the score. The
     * grading job holds no credential, so results come back by us reading the
     * artifact rather than the workflow calling us.
     */
    async completeRun(
        runId: string,
        conclusion: CIRunConclusion,
    ): Promise<void> {
        const run = await this.ciRunRepository.findOne({
            where: { id: runId },
            relations: { submission: true },
        });
        if (!run || run.isTerminal) return;

        let report: GradingReport | null = null;
        if (run.githubRunId) {
            report = await this.fetchReport(Number(run.githubRunId));
            await this.captureLogs(run);
        }

        // The report is more precise than the run conclusion, but a missing or
        // malformed artifact must not lose a result — fall back to the
        // conclusion alone.
        const passed =
            report != null
                ? report.passed
                : conclusion === CIRunConclusion.SUCCESS;
        const effective = passed
            ? CIRunConclusion.SUCCESS
            : conclusion === CIRunConclusion.SUCCESS
              ? CIRunConclusion.FAILURE
              : conclusion;

        await this.dbTransactionService.execute(async (manager) => {
            await manager.update(
                CIRun,
                { id: run.id },
                {
                    status: CIRunStatus.COMPLETED,
                    conclusion: effective,
                    completedAt: new Date(),
                    report,
                    testsPassed:
                        report?.tests.filter((t) => t.status === 'passed')
                            .length ?? null,
                    testsTotal: report?.tests.length ?? null,
                },
            );

            const submission = await manager.findOne(AssignmentSubmission, {
                where: { id: run.submission.id },
                relations: { bestRun: true },
            });
            if (!submission) {
                throw new ServiceError(
                    `Submission ${run.submission.id} vanished while completing run ${run.id}`,
                );
            }

            // Best-run-wins: the first score-eligible pass is recorded and never
            // replaced, so iterating cannot cost a student a pass they earned.
            const shouldSetBest =
                run.countsForScore &&
                effective === CIRunConclusion.SUCCESS &&
                submission.bestRun == null;

            await manager.update(
                AssignmentSubmission,
                { id: submission.id },
                {
                    latestRun: { id: run.id },
                    ...(shouldSetBest ? { bestRun: { id: run.id } } : {}),
                },
            );

            await this.scoreWriteback.sync(manager, submission.id);
        });

        this.logger.log(`Run ${run.id} completed: ${effective}`);
    }

    private async fetchReport(
        githubRunId: number,
    ): Promise<GradingReport | null> {
        try {
            const artifacts = await this.gitHubAppClient.listRunArtifacts(
                this.graderOwner,
                this.graderRepo,
                githubRunId,
            );
            const artifact = artifacts.find(
                (candidate) =>
                    candidate.name === REPORT_ARTIFACT_NAME &&
                    !candidate.expired,
            );
            if (!artifact) return null;

            const zip = await this.gitHubAppClient.downloadArtifact(
                this.graderOwner,
                this.graderRepo,
                artifact.id,
            );
            const entry = new AdmZip(zip)
                .getEntries()
                .find((candidate) => candidate.entryName === REPORT_FILE_NAME);
            if (!entry) return null;

            const parsed = JSON.parse(
                entry.getData().toString('utf8'),
            ) as GradingReport;
            if (typeof parsed?.passed !== 'boolean') return null;

            return { ...parsed, tests: parsed.tests ?? [] };
        } catch (error) {
            this.logger.warn(
                `Could not read report for GitHub run ${githubRunId}: ${error instanceof Error ? error.message : error}`,
            );
            return null;
        }
    }

    /** Stores the grading job's output once, when the run finishes. */
    private async captureLogs(run: CIRun): Promise<void> {
        try {
            const existing = await this.ciRunLogRepository.exist({
                where: { ciRun: { id: run.id } },
            });
            if (existing) return;

            const jobs = await this.gitHubAppClient.listRunJobs(
                this.graderOwner,
                this.graderRepo,
                Number(run.githubRunId),
            );
            const job =
                jobs.find((candidate) => candidate.name === GRADE_JOB_NAME) ??
                jobs[jobs.length - 1];
            if (!job) return;

            const raw = await this.gitHubAppClient.getJobLogs(
                this.graderOwner,
                this.graderRepo,
                job.id,
            );
            if (raw === null) return;

            const { content, truncated } = truncateLog(raw);
            const log = this.ciRunLogRepository.create({
                ciRun: { id: run.id },
                content,
                sizeBytes: Buffer.byteLength(raw, 'utf8'),
                truncated,
            });
            await this.ciRunLogRepository.save(log);
        } catch (error) {
            // Logs are a convenience; losing them must not block the score.
            this.logger.warn(
                `Could not capture logs for run ${run.id}: ${error instanceof Error ? error.message : error}`,
            );
        }
    }

    // --- Helpers ---------------------------------------------------------

    private async readJobs(githubRunId: number): Promise<CIRunJob[]> {
        try {
            return await this.gitHubAppClient.listRunJobs(
                this.graderOwner,
                this.graderRepo,
                githubRunId,
            );
        } catch (error) {
            this.logger.warn(
                `Could not read jobs for GitHub run ${githubRunId}: ${error instanceof Error ? error.message : error}`,
            );
            return [];
        }
    }

    private async loadRunForViewer(runId: string, user: User): Promise<CIRun> {
        const run = await this.ciRunRepository.findOne({
            where: { id: runId },
            relations: {
                submission: { assignment: { cohortWeek: { cohort: true } } },
            },
        });
        if (!run) throw new NotFoundException('Run not found');

        // Reuses the single ownership check every submission endpoint shares.
        await this.assignmentsService.resolveSubmissionForViewer(
            run.submission.id,
            user,
        );
        return run;
    }

    /** True when this caller won the right to refresh; false while cooling down. */
    private async claimRefreshSlot(runId: string): Promise<boolean> {
        const key = `run:refresh:${runId}`;
        if (await this.cacheManager.get(key)) return false;
        await this.cacheManager.set(key, 1, REFRESH_COOLDOWN_MS);
        return true;
    }

    private buildReconcileTask(
        ciRunId: string,
        attempt: number,
        task: APITask<TaskType.RECONCILE_CI_RUN>,
    ): APITask<TaskType.RECONCILE_CI_RUN> {
        const delay =
            RECONCILE_DELAYS_SECONDS[
                Math.min(attempt, RECONCILE_DELAYS_SECONDS.length - 1)
            ];
        task.type = TaskType.RECONCILE_CI_RUN;
        task.data = { ciRunId, attempt };
        task.executeOnTime = new Date(Date.now() + delay * 1000);
        return task;
    }

    private toDetail(
        run: CIRun,
        submission: AssignmentSubmission | undefined,
        hasLogs = false,
    ): CIRunDetailResponseDto {
        return new CIRunDetailResponseDto(
            run,
            submission?.repoFullName ?? null,
            hasLogs,
        );
    }
}

/** GitHub's run statuses collapse to the three the UI distinguishes. */
function mapRunStatus(status: string | null): CIRunStatus {
    switch (status) {
        case 'completed':
            return CIRunStatus.COMPLETED;
        case 'in_progress':
            return CIRunStatus.IN_PROGRESS;
        default:
            return CIRunStatus.QUEUED;
    }
}

function mapConclusion(conclusion: string | null): CIRunConclusion {
    switch (conclusion) {
        case 'success':
            return CIRunConclusion.SUCCESS;
        case 'cancelled':
            return CIRunConclusion.CANCELLED;
        case 'timed_out':
            return CIRunConclusion.TIMED_OUT;
        case 'startup_failure':
            return CIRunConclusion.STARTUP_FAILURE;
        default:
            // skipped / neutral / action_required / stale all mean "did not pass".
            return CIRunConclusion.FAILURE;
    }
}

/** Keeps the tail, which is where the failure is, and drops the middle. */
function truncateLog(raw: string): { content: string; truncated: boolean } {
    const buffer = Buffer.from(raw, 'utf8');
    if (buffer.byteLength <= MAX_LOG_BYTES) {
        return { content: raw, truncated: false };
    }

    const half = Math.floor(MAX_LOG_BYTES / 2);
    const head = buffer.subarray(0, half).toString('utf8');
    const tail = buffer.subarray(buffer.byteLength - half).toString('utf8');
    const dropped = buffer.byteLength - MAX_LOG_BYTES;

    return {
        content: `${head}\n\n... [${dropped} bytes truncated] ...\n\n${tail}`,
        truncated: true,
    };
}
