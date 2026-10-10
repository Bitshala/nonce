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
import { Assignment } from '@/entities/assignment.entity';
import { AssignmentSubmission } from '@/entities/assignment-submission.entity';
import { CIRun } from '@/entities/ci-run.entity';
import { CIRunLog } from '@/entities/ci-run-log.entity';
import { User } from '@/entities/user.entity';
import { AssignmentStatus, CIRunConclusion, CIRunStatus } from '@/common/enum';

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

/** RunsService with only the collaborators a test cares about wired in. */
async function compileRunsService(deps: {
    ciRunRepository?: object;
    ciRunLogRepository?: object;
    gitHubAppClient?: object;
    assignmentsService?: object;
    submissionsService?: object;
    scoreWriteback?: object;
    dbTransactionService?: object;
    cacheManager?: object;
    config?: Record<string, string>;
}): Promise<RunsService> {
    const module: TestingModule = await Test.createTestingModule({
        providers: [
            RunsService,
            {
                provide: getRepositoryToken(CIRun),
                useValue: deps.ciRunRepository ?? {},
            },
            {
                provide: getRepositoryToken(CIRunLog),
                useValue: deps.ciRunLogRepository ?? {},
            },
            { provide: getRepositoryToken(AssignmentSubmission), useValue: {} },
            { provide: GitHubAppClient, useValue: deps.gitHubAppClient ?? {} },
            {
                provide: AssignmentsService,
                useValue: deps.assignmentsService ?? {},
            },
            {
                provide: SubmissionsService,
                useValue: deps.submissionsService ?? {},
            },
            {
                provide: ExerciseScoreWritebackService,
                useValue: deps.scoreWriteback ?? {},
            },
            {
                provide: DbTransactionService,
                useValue: deps.dbTransactionService ?? {},
            },
            { provide: CACHE_MANAGER, useValue: deps.cacheManager ?? {} },
            {
                provide: ConfigService,
                useValue: { get: (key: string) => deps.config?.[key] },
            },
        ],
    }).compile();
    return module.get(RunsService);
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

        service = await compileRunsService({
            ciRunRepository,
            ciRunLogRepository,
            gitHubAppClient,
            assignmentsService,
            scoreWriteback,
            dbTransactionService,
            cacheManager,
        });
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

// A regrade is how a grader fix reaches students who already ran. What it may
// score is exactly the work that could have scored on its own — never practice
// done after the deadline — and it ignores the gates that exist to limit
// students (closed, the deadline, the daily quota).
describe('RunsService — regrade', () => {
    let service: RunsService;

    const ELIGIBLE = 'e'.repeat(40);
    const LATEST = 'f'.repeat(40);
    const TEMPLATE = 'a'.repeat(40);

    const ciRunRepository = {
        findOne: jest.fn(),
        update: jest.fn(async () => ({ affected: 1 })),
    };
    const gitHubAppClient = {
        dispatchWorkflow: jest.fn(async () => undefined),
    };
    const manager = {
        // The locked submission row, then nothing in flight.
        findOne: jest.fn<Promise<null>, [unknown, unknown]>(async () => null),
        create: jest.fn((_: unknown, fields: object) => ({
            id: 'run-new',
            ...fields,
        })),
        save: jest.fn(async () => undefined),
        update: jest.fn(async () => ({ affected: 1 })),
    };
    const dbTransactionService = {
        execute: jest.fn(async (cb: (m: unknown) => unknown) => cb(manager)),
    };

    const staff = { id: 'staff-1' } as User;
    const DAY = 24 * 60 * 60 * 1000;

    // Every student gate is shut, so a dispatch proves they were bypassed.
    const assignment = (deadline: Date): Assignment =>
        Object.assign(new Assignment(), {
            slug: 'pb-week-1-s4',
            graderTestPath: 'suites/pb-week-1',
            runTimeoutMinutes: 10,
            status: AssignmentStatus.CLOSED,
            deadline,
            allowLateSubmission: false,
            maxRunsPerDay: 0,
        });
    const pastDeadline = () => assignment(new Date(Date.now() - DAY));
    const beforeDeadline = () => assignment(new Date(Date.now() + DAY));

    const submission = (lastCommitSha = LATEST): AssignmentSubmission =>
        Object.assign(new AssignmentSubmission(), {
            id: 'submission-1',
            repoOwner: 'org',
            repoName: 'pb-week-1-s4-user-1',
            initialCommitSha: TEMPLATE,
            lastCommitSha,
        });

    const dispatchedCommit = () =>
        (
            gitHubAppClient.dispatchWorkflow.mock.calls[0] as unknown as [
                { inputs: { commit_sha: string } },
            ]
        )[0].inputs.commit_sha;

    beforeEach(async () => {
        service = await compileRunsService({
            ciRunRepository,
            gitHubAppClient,
            dbTransactionService,
        });
    });

    afterEach(() => jest.clearAllMocks());

    it('past the deadline, grades the commit of the last run that counted', async () => {
        ciRunRepository.findOne.mockResolvedValueOnce({ commitSha: ELIGIBLE });

        const run = await service.dispatchRegrade(
            submission(),
            pastDeadline(),
            staff,
        );

        expect(ciRunRepository.findOne).toHaveBeenNthCalledWith(1, {
            where: { submission: { id: 'submission-1' }, countsForScore: true },
            order: { dispatchedAt: 'DESC' },
        });
        expect(dispatchedCommit()).toBe(ELIGIBLE);
        expect(run).toEqual(
            expect.objectContaining({
                commitSha: ELIGIBLE,
                countsForScore: true,
                triggeredByUser: staff,
            }),
        );
    });

    it('before the deadline, grades the latest commit', async () => {
        const run = await service.dispatchRegrade(
            submission(),
            beforeDeadline(),
            staff,
        );

        expect(dispatchedCommit()).toBe(LATEST);
        expect(run?.countsForScore).toBe(true);
    });

    it('past the deadline, has nothing to re-grade when no run ever counted', async () => {
        ciRunRepository.findOne.mockResolvedValueOnce(null);

        const run = await service.dispatchRegrade(
            submission(),
            pastDeadline(),
            staff,
        );

        expect(run).toBeNull();
        expect(gitHubAppClient.dispatchWorkflow).not.toHaveBeenCalled();
    });

    it('before the deadline, skips a submission with nothing beyond the template', async () => {
        const run = await service.dispatchRegrade(
            submission(TEMPLATE),
            beforeDeadline(),
            staff,
        );

        expect(run).toBeNull();
        expect(gitHubAppClient.dispatchWorkflow).not.toHaveBeenCalled();
    });

    it('does not take a practice run in flight on the same commit as the regrade', async () => {
        ciRunRepository.findOne.mockResolvedValueOnce({ commitSha: ELIGIBLE });

        await service.dispatchRegrade(submission(), pastDeadline(), staff);

        const [, inFlightQuery] = manager.findOne.mock.calls.find(
            ([target]) => target === CIRun,
        ) as unknown as [unknown, { where: Record<string, unknown> }];
        expect(inFlightQuery.where).toEqual(
            expect.objectContaining({
                commitSha: ELIGIBLE,
                countsForScore: true,
            }),
        );
    });
});

// Run is the one student action that spends something real — Actions minutes
// and their daily quota — so the in-flight de-dupe and the quota have to hold
// when requests arrive together: two tabs, a double click, or a script.
describe('RunsService — starting runs concurrently', () => {
    let service: RunsService;

    // The runs table, and the row lock on the submission: whoever takes it
    // waits for the previous holder's transaction to finish.
    let runs: { id: string; commitSha: string; status: CIRunStatus }[];
    let lockQueue: Promise<void>;

    const inFlightOn = (commitSha: string) =>
        runs.find(
            (run) => run.commitSha === commitSha && run.status !== 'COMPLETED',
        ) ?? null;

    const newManager = (releaseOnCommit: (release: () => void) => void) => ({
        findOne: jest.fn(
            async (
                target: unknown,
                options: {
                    where: { commitSha?: string };
                    lock?: unknown;
                },
            ) => {
                if (target === AssignmentSubmission) {
                    if (options.lock) {
                        const previous = lockQueue;
                        lockQueue = new Promise((resolve) =>
                            releaseOnCommit(resolve),
                        );
                        await previous;
                    }
                    return { id: 'submission-1' };
                }
                return inFlightOn(options.where.commitSha ?? '');
            },
        ),
        create: jest.fn((_: unknown, fields: { commitSha: string }) => ({
            id: `run-${runs.length + 1}`,
            ...fields,
        })),
        save: jest.fn(async (entity: { commitSha?: string }) => {
            if (entity.commitSha) runs.push(entity as (typeof runs)[number]);
        }),
        update: jest.fn(async () => ({ affected: 1 })),
    });

    const dbTransactionService = {
        execute: jest.fn(async (cb: (m: unknown) => unknown) => {
            let release: () => void = () => undefined;
            try {
                return await cb(newManager((r) => (release = r)));
            } finally {
                release();
            }
        }),
    };
    const ciRunRepository = {
        findOne: jest.fn(async ({ where }: { where: { commitSha: string } }) =>
            inFlightOn(where.commitSha),
        ),
        update: jest.fn(async () => ({ affected: 1 })),
    };
    const gitHubAppClient = {
        dispatchWorkflow: jest.fn(async () => undefined),
    };
    const assignmentsService = {
        assertOpenForSubmission: jest.fn(),
        countRunsToday: jest.fn(async () => runs.length),
    };

    const student = { id: 'student-1' } as User;
    const withQuota = (maxRunsPerDay: number) => ({
        loadReadySubmission: jest.fn(async () =>
            Object.assign(new AssignmentSubmission(), {
                id: 'submission-1',
                user: student,
                repoOwner: 'org',
                repoName: 'repo',
                assignment: Object.assign(new Assignment(), {
                    slug: 'pb-week-1-s4',
                    deadline: null,
                    maxRunsPerDay,
                    runTimeoutMinutes: 10,
                }),
            }),
        ),
    });

    const start = async (maxRunsPerDay: number) => {
        runs = [];
        lockQueue = Promise.resolve();
        service = await compileRunsService({
            ciRunRepository,
            gitHubAppClient,
            assignmentsService,
            submissionsService: withQuota(maxRunsPerDay),
            dbTransactionService,
        });
    };

    afterEach(() => jest.clearAllMocks());

    it('dispatches once when Run is pressed several times on one commit', async () => {
        await start(50);
        const sha = 'a'.repeat(40);

        const results = await Promise.all(
            Array.from({ length: 5 }, () =>
                service.createRun('submission-1', sha, student),
            ),
        );

        expect(gitHubAppClient.dispatchWorkflow).toHaveBeenCalledTimes(1);
        expect(new Set(results.map((r) => r.id)).size).toBe(1);
    });

    it('holds the daily quota against parallel runs on different commits', async () => {
        await start(2);

        const results = await Promise.allSettled(
            ['a', 'b', 'c', 'd', 'e'].map((c) =>
                service.createRun('submission-1', c.repeat(40), student),
            ),
        );

        expect(gitHubAppClient.dispatchWorkflow).toHaveBeenCalledTimes(2);
        expect(results.filter((r) => r.status === 'rejected')).toHaveLength(3);
    });
});

describe('RunsService — isGraderRepo', () => {
    it('recognises the configured grader repo, in any case', async () => {
        const service = await compileRunsService({
            config: { 'githubApp.graderRepo': 'Bitshala-Classrooms/grader' },
        });

        expect(service.isGraderRepo('bitshala-classrooms/GRADER')).toBe(true);
        expect(service.isGraderRepo('Bitshala-Classrooms/pb-week-1')).toBe(
            false,
        );
        expect(service.isGraderRepo(undefined)).toBe(false);
    });

    it('trusts no repo when none is configured', async () => {
        const service = await compileRunsService({});

        expect(service.isGraderRepo('/')).toBe(false);
    });
});
