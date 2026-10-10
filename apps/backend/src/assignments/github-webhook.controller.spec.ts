import type { Cache } from 'cache-manager';
import { GitHubWebhookController } from '@/assignments/github-webhook.controller';
import { RunsService } from '@/assignments/runs.service';
import { CIRun } from '@/entities/ci-run.entity';

// Webhooks are how most runs finish, so a delivery that is dropped, or one
// that is believed when it should not be, decides a student's score.
describe('GitHubWebhookController', () => {
    let cache: Map<string, unknown>;
    let runsService: {
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
});
