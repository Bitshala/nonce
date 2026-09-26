import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { FindOperator } from 'typeorm';
import { RunsService } from '@/assignments/runs.service';
import { AssignmentsService } from '@/assignments/assignments.service';
import { SubmissionsService } from '@/assignments/submissions.service';
import { ExerciseScoreWritebackService } from '@/assignments/exercise-score-writeback.service';
import { DbTransactionService } from '@/db-transaction/db-transaction.service';
import { GitHubAppClient } from '@/github-app/client/github-app.client';
import { WorkflowRunSummary } from '@/github-app/client/response';
import { AssignmentSubmission } from '@/entities/assignment-submission.entity';
import { CIRun } from '@/entities/ci-run.entity';
import { CIRunLog } from '@/entities/ci-run-log.entity';
import { User } from '@/entities/user.entity';
import { CIRunConclusion, CIRunStatus } from '@/common/enum';

/**
 * Enough of `UPDATE … WHERE` to tell a claimed row from a lost one. The races
 * these tests pin are all decided by the WHERE clause, so the fakes have to
 * honour it rather than accept every write.
 */
function satisfies(actual: unknown, condition: unknown): boolean {
    if (condition instanceof FindOperator) {
        switch (condition.type) {
            case 'not':
                return !satisfies(actual, condition.child ?? condition.value);
            case 'in':
                return (condition.value as unknown[]).includes(actual);
            case 'isNull':
                return actual == null;
            default:
                throw new Error(`Unsupported operator ${condition.type}`);
        }
    }
    return actual === condition;
}

function applyUpdate(
    row: Record<string, unknown>,
    criteria: Record<string, unknown>,
    partial: Record<string, unknown>,
): { affected: number } {
    const matches = Object.entries(criteria).every(([key, condition]) =>
        satisfies(row[key], condition),
    );
    if (!matches) return { affected: 0 };
    Object.assign(row, partial);
    return { affected: 1 };
}

// Every path that finishes a run — webhook, reconcile sweep, an editor's poll —
// goes through applyRunState and completeRun, and they can overlap. What must
// hold: a finished run is scored exactly once, the first eligible pass stays the
// best run, and nothing reopens or relabels a run that has finished.
describe('RunsService — completing a run', () => {
    let service: RunsService;

    // The rows as the database holds them. Reads hand back copies, the way a
    // real query would, so a caller holding an old read sees stale state.
    let runRow: Record<string, unknown>;
    let submissionRow: Record<string, unknown>;

    const snapshot = (): CIRun =>
        Object.assign(new CIRun(), structuredClone(runRow));

    const ciRunRepository = {
        findOne: jest.fn(async () => snapshot()),
        update: jest.fn(
            async (
                criteria: Record<string, unknown>,
                partial: Record<string, unknown>,
            ) => applyUpdate(runRow, criteria, partial),
        ),
    };
    const ciRunLogRepository = { exist: jest.fn(async () => true) };
    const gitHubAppClient = {
        listRunJobs: jest.fn(async () => []),
        listRunArtifacts: jest.fn(async () => []),
        listRecentDispatchRuns: jest.fn(async () => []),
        getWorkflowRun: jest.fn(),
    };
    const scoreWriteback = { sync: jest.fn(async () => undefined) };
    const assignmentsService = {
        resolveSubmissionForViewer: jest.fn(async () => ({})),
    };
    const cacheManager = {
        get: jest.fn(async () => undefined),
        set: jest.fn(async () => undefined),
    };
    const manager = {
        update: jest.fn(
            async (
                target: unknown,
                criteria: Record<string, unknown>,
                partial: Record<string, unknown>,
            ) =>
                applyUpdate(
                    target === CIRun ? runRow : submissionRow,
                    criteria,
                    partial,
                ),
        ),
    };
    const dbTransactionService = {
        execute: jest.fn(async (cb: (m: unknown) => unknown) => cb(manager)),
    };

    const remote = (
        status: string,
        conclusion: string | null,
    ): WorkflowRunSummary => ({
        id: 42,
        runAttempt: 1,
        status,
        conclusion,
        displayTitle: 'grade-token-1',
        htmlUrl: 'https://github.com/org/grader/actions/runs/42',
        createdAt: '2026-09-26T10:00:00Z',
        runStartedAt: '2026-09-26T10:00:05Z',
        updatedAt: '2026-09-26T10:03:00Z',
    });

    beforeEach(async () => {
        runRow = {
            id: 'run-1',
            submission: { id: 'submission-1' },
            commitSha: 'c'.repeat(40),
            correlationToken: 'token-1',
            githubRunId: '42',
            githubRunAttempt: 1,
            status: CIRunStatus.IN_PROGRESS,
            conclusion: null,
            countsForScore: true,
            dispatchedAt: new Date(),
            startedAt: null,
            completedAt: null,
            jobs: [],
            report: null,
            testsPassed: null,
            testsTotal: null,
        };
        submissionRow = {
            id: 'submission-1',
            bestRun: null,
            latestRun: { id: 'run-1' },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RunsService,
                {
                    provide: getRepositoryToken(CIRun),
                    useValue: ciRunRepository,
                },
                {
                    provide: getRepositoryToken(CIRunLog),
                    useValue: ciRunLogRepository,
                },
                {
                    provide: getRepositoryToken(AssignmentSubmission),
                    useValue: {},
                },
                { provide: GitHubAppClient, useValue: gitHubAppClient },
                { provide: AssignmentsService, useValue: assignmentsService },
                { provide: SubmissionsService, useValue: {} },
                {
                    provide: ExerciseScoreWritebackService,
                    useValue: scoreWriteback,
                },
                {
                    provide: DbTransactionService,
                    useValue: dbTransactionService,
                },
                { provide: CACHE_MANAGER, useValue: cacheManager },
                { provide: ConfigService, useValue: { get: () => undefined } },
            ],
        }).compile();
        service = module.get(RunsService);
    });

    afterEach(() => jest.clearAllMocks());

    it('scores a run GitHub reports as completed', async () => {
        // The regression: applyRunState used to write COMPLETED itself, so
        // completeRun saw a finished run and returned before recording
        // anything — no conclusion, no best run, no score.
        await service.applyRunState(snapshot(), remote('completed', 'success'));

        expect(runRow.status).toBe(CIRunStatus.COMPLETED);
        expect(runRow.conclusion).toBe(CIRunConclusion.SUCCESS);
        expect(submissionRow.bestRun).toEqual({ id: 'run-1' });
        expect(scoreWriteback.sync).toHaveBeenCalledTimes(1);
    });

    it('records the result once when two callers finish the same run', async () => {
        // Both read the run while it is still live; only one may claim it.
        await Promise.all([
            service.completeRun('run-1', CIRunConclusion.SUCCESS),
            service.completeRun('run-1', CIRunConclusion.SUCCESS),
        ]);

        expect(runRow.status).toBe(CIRunStatus.COMPLETED);
        expect(scoreWriteback.sync).toHaveBeenCalledTimes(1);
    });

    it('keeps the first pass when a later passing run finishes', async () => {
        submissionRow.bestRun = { id: 'run-0' };

        await service.completeRun('run-1', CIRunConclusion.SUCCESS);

        expect(submissionRow.bestRun).toEqual({ id: 'run-0' });
        expect(manager.update).toHaveBeenCalledWith(
            AssignmentSubmission,
            expect.objectContaining({
                bestRun: expect.any(FindOperator),
            }),
            { bestRun: { id: 'run-1' } },
        );
    });

    it('does not make a pass out of a run that cannot count', async () => {
        runRow.countsForScore = false;

        await service.completeRun('run-1', CIRunConclusion.SUCCESS);

        expect(runRow.conclusion).toBe(CIRunConclusion.SUCCESS);
        expect(submissionRow.bestRun).toBeNull();
    });

    it('leaves latestRun alone, so an older run finishing last cannot displace it', async () => {
        submissionRow.latestRun = { id: 'run-2' };

        await service.completeRun('run-1', CIRunConclusion.FAILURE);

        expect(submissionRow.latestRun).toEqual({ id: 'run-2' });
    });

    it('never reopens a finished run on a late refresh', async () => {
        const stale = snapshot();
        runRow.status = CIRunStatus.COMPLETED;
        runRow.conclusion = CIRunConclusion.SUCCESS;

        await service.applyRunState(stale, remote('in_progress', null));

        expect(runRow.status).toBe(CIRunStatus.COMPLETED);
        expect(scoreWriteback.sync).not.toHaveBeenCalled();
    });

    describe('orphaning', () => {
        const longAgo = () => new Date(Date.now() - 10 * 60_000);

        it('orphans a run that never correlated', async () => {
            runRow.githubRunId = null;
            runRow.status = CIRunStatus.QUEUED;
            runRow.dispatchedAt = longAgo();

            await service.refresh(snapshot());

            expect(runRow.status).toBe(CIRunStatus.ORPHANED);
        });

        it('does not orphan a run the webhook correlated and finished meanwhile', async () => {
            // The sweep read the run before the webhook matched it, and the
            // dispatch list it checks only covers recent runs.
            runRow.githubRunId = null;
            runRow.status = CIRunStatus.QUEUED;
            runRow.dispatchedAt = longAgo();
            const stale = snapshot();
            runRow.githubRunId = '42';
            runRow.status = CIRunStatus.COMPLETED;

            await service.refresh(stale);

            expect(runRow.status).toBe(CIRunStatus.COMPLETED);
        });
    });

    it('still answers an editor poll when the refresh fails', async () => {
        gitHubAppClient.getWorkflowRun.mockRejectedValueOnce(
            new Error('GitHub is down'),
        );

        const detail = await service.getRun('run-1', {
            id: 'user-1',
        } as User);

        expect(detail.status).toBe(CIRunStatus.IN_PROGRESS);
    });
});
