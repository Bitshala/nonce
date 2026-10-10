import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { FindOperator } from 'typeorm';
import { SubmissionsService } from '@/assignments/submissions.service';
import { AssignmentsService } from '@/assignments/assignments.service';
import { ExerciseScoreWritebackService } from '@/assignments/exercise-score-writeback.service';
import { DbTransactionService } from '@/db-transaction/db-transaction.service';
import { GitHubAppClient } from '@/github-app/client/github-app.client';
import { Assignment } from '@/entities/assignment.entity';
import { AssignmentSubmission } from '@/entities/assignment-submission.entity';
import { User } from '@/entities/user.entity';
import { ProvisionStatus } from '@/common/enum';

/** The WHERE operators recordCommit's guard uses, evaluated against a row. */
function satisfies(actual: unknown, condition: unknown): boolean {
    if (!(condition instanceof FindOperator)) return actual === condition;
    switch (condition.type) {
        case 'or':
            return (condition.value as unknown as FindOperator<unknown>[]).some(
                (child) => satisfies(actual, child),
            );
        case 'isNull':
            return actual == null;
        case 'lessThan':
            return (
                actual != null && (actual as Date) < (condition.value as Date)
            );
        default:
            throw new Error(`Unsupported operator ${condition.type}`);
    }
}

describe('SubmissionsService — recording a save', () => {
    let service: SubmissionsService;

    const BASE = '0'.repeat(40);
    const OLDER = 'a'.repeat(40);
    const NEWER = 'b'.repeat(40);

    let row: Record<string, unknown>;
    const manager = {
        update: jest.fn(
            async (
                _target: unknown,
                criteria: Record<string, unknown>,
                partial: Record<string, unknown>,
            ) => {
                const matches = Object.entries(criteria).every(([key, value]) =>
                    satisfies(row[key], value),
                );
                if (matches) Object.assign(row, partial);
                return { affected: matches ? 1 : 0 };
            },
        ),
    };

    // Each save's branch update waits on a gate the test opens, so the order
    // saves land in and the order they record in can be set independently.
    const gates = new Map<string, () => void>();
    const gitHubAppClient = {
        getBranchHead: jest.fn(async () => BASE),
        getCommit: jest.fn(async () => ({ treeSha: 'tree-base' })),
        createBlob: jest.fn(async () => 'blob'),
        createTree: jest.fn(async () => 'tree-new'),
        createCommit: jest.fn(
            async ({ message }: { message: string }) => message,
        ),
        updateBranchHead: jest.fn(
            ({ sha }: { sha: string }) =>
                new Promise<boolean>((resolve) =>
                    gates.set(sha, () => resolve(true)),
                ),
        ),
    };

    const submission = () =>
        Object.assign(new AssignmentSubmission(), {
            id: 'submission-1',
            repoOwner: 'org',
            repoName: 'repo',
            defaultBranch: 'main',
            provisionStatus: ProvisionStatus.READY,
            assignment: Object.assign(new Assignment(), {
                protectedPaths: [],
            }),
        });

    const save = (sha: string) =>
        service.commit(
            'submission-1',
            {
                baseCommitSha: BASE,
                // The fake createCommit answers with the message as the sha.
                message: sha,
                files: [{ path: 'main.py', content: sha, encoding: 'utf-8' }],
            },
            { id: 'student-1', name: 'Student' } as User,
        );

    const until = async (sha: string) => {
        while (!gates.has(sha)) await new Promise(setImmediate);
    };
    const land = (sha: string) => gates.get(sha)?.();

    beforeEach(async () => {
        jest.useFakeTimers({
            doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'],
            now: new Date('2026-10-10T10:00:00Z'),
        });
        row = { id: 'submission-1', lastCommitSha: BASE, lastCommitAt: null };
        gates.clear();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SubmissionsService,
                {
                    provide: getRepositoryToken(AssignmentSubmission),
                    useValue: {},
                },
                { provide: GitHubAppClient, useValue: gitHubAppClient },
                {
                    provide: AssignmentsService,
                    useValue: {
                        resolveSubmissionForViewer: jest.fn(async () =>
                            submission(),
                        ),
                        assertOpenForSubmission: jest.fn(),
                    },
                },
                {
                    provide: ExerciseScoreWritebackService,
                    useValue: { sync: jest.fn() },
                },
                {
                    provide: DbTransactionService,
                    useValue: {
                        execute: jest.fn(async (cb: (m: unknown) => unknown) =>
                            cb(manager),
                        ),
                    },
                },
                { provide: CACHE_MANAGER, useValue: {} },
            ],
        }).compile();
        service = module.get(SubmissionsService);
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    it('records each save in turn when they finish in order', async () => {
        const older = save(OLDER);
        await until(OLDER);
        land(OLDER);
        await older;

        jest.advanceTimersByTime(1000);
        const newer = save(NEWER);
        await until(NEWER);
        land(NEWER);
        await newer;

        expect(row.lastCommitSha).toBe(NEWER);
    });

    it('keeps the newer head when an older save records last', async () => {
        const older = save(OLDER);
        await until(OLDER);

        // The newer save starts later and records first.
        jest.advanceTimersByTime(1000);
        const newer = save(NEWER);
        await until(NEWER);
        land(NEWER);
        await newer;

        land(OLDER);
        await older;

        expect(row.lastCommitSha).toBe(NEWER);
    });
});
