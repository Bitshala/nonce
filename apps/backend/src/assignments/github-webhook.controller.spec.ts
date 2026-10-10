import type { Cache } from 'cache-manager';
import { GitHubWebhookController } from '@/assignments/github-webhook.controller';
import { RunsService } from '@/assignments/runs.service';
import { CIRun } from '@/entities/ci-run.entity';

// Webhooks are how most runs finish, so a delivery that is dropped, or one
// that is believed when it should not be, decides a student's score.
describe('GitHubWebhookController', () => {
    let cache: Map<string, unknown>;
    let runsService: {
        isGraderRepo: jest.Mock;
        findRunByCorrelationToken: jest.Mock;
        findRunByGithubRunId: jest.Mock;
        applyRunState: jest.Mock;
    };
    let controller: GitHubWebhookController;

    const live = Object.assign(new CIRun(), {
        id: 'run-1',
        status: 'IN_PROGRESS',
    });
    const workflowRun = {
        action: 'completed',
        repository: { full_name: 'org/grader' },
        workflow_run: {
            id: 42,
            run_attempt: 1,
            status: 'completed',
            conclusion: 'success',
            display_title: 'grade-token-1',
            html_url: 'https://github.com/org/grader/actions/runs/42',
            created_at: '2026-10-10T10:00:00Z',
            updated_at: '2026-10-10T10:03:00Z',
        },
    };

    const settle = () => new Promise((resolve) => setImmediate(resolve));
    const deliver = async (deliveryId: string) => {
        await controller.receive('workflow_run', deliveryId, workflowRun);
        await settle();
    };

    beforeEach(() => {
        cache = new Map();
        runsService = {
            isGraderRepo: jest.fn((name: string) => name === 'org/grader'),
            findRunByCorrelationToken: jest.fn(async () => live),
            findRunByGithubRunId: jest.fn(async () => live),
            applyRunState: jest.fn(async () => undefined),
        };
        controller = new GitHubWebhookController(
            runsService as unknown as RunsService,
            {
                get: jest.fn(async (key: string) => cache.get(key)),
                set: jest.fn(async (key: string, value: unknown) => {
                    cache.set(key, value);
                }),
            } as unknown as Cache,
        );
    });

    describe('delivery dedupe', () => {
        it('ignores a delivery it has already handled', async () => {
            await deliver('delivery-1');
            await deliver('delivery-1');

            expect(runsService.applyRunState).toHaveBeenCalledTimes(1);
        });

        it('handles a redelivery of one that failed', async () => {
            runsService.applyRunState.mockRejectedValueOnce(
                new Error('database blip'),
            );

            await deliver('delivery-1');
            await deliver('delivery-1');

            expect(runsService.applyRunState).toHaveBeenCalledTimes(2);
        });
    });

    describe('where a run comes from', () => {
        it('ignores a run from any repo but the grader', async () => {
            // A student repo's workflow can be titled grade-<token> too.
            await controller.receive('workflow_run', 'delivery-1', {
                ...workflowRun,
                repository: { full_name: 'org/pb-week-1-s4-student-1' },
            });
            await settle();

            expect(
                runsService.findRunByCorrelationToken,
            ).not.toHaveBeenCalled();
            expect(runsService.applyRunState).not.toHaveBeenCalled();
        });

        it('ignores a job event from any repo but the grader', async () => {
            await controller.receive('workflow_job', 'delivery-1', {
                repository: { full_name: 'org/elsewhere' },
                workflow_job: {
                    id: 7,
                    run_id: 42,
                    name: 'grade',
                    status: 'completed',
                    conclusion: 'success',
                },
            });
            await settle();

            expect(runsService.findRunByGithubRunId).not.toHaveBeenCalled();
        });
    });
});
