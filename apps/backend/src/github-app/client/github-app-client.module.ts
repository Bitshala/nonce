import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { Octokit } from '@octokit/rest';
import { GITHUB_APP_OCTOKIT_INJECTION_TOKEN } from '@/github-app/client/github-app-client.constants';
import { GitHubAppClient } from '@/github-app/client/github-app.client';

// Warn once the installation has burned through this much of its hourly budget.
// §9.4 of the design sizes the whole feature against this ceiling.
const RATE_LIMIT_WARN_FRACTION = 0.2;

/**
 * Builds the Octokit instance that speaks as the GitHub App installation.
 *
 * Unlike the Classroom client this authenticates as an App rather than with a
 * PAT: the installation token is scoped to the org, is attributed to the App
 * rather than to whoever owns a token, and carries a rate limit that scales
 * with the installation. `@octokit/auth-app` mints and refreshes the token
 * itself, so nothing here has to track expiry.
 *
 * Resolves to `null` when the `githubApp` config block is absent. That keeps a
 * developer without a registered App able to boot; `GitHubAppClient` is what
 * fails, loudly, on first use.
 */
@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: GITHUB_APP_OCTOKIT_INJECTION_TOKEN,
            inject: [ConfigService],
            useFactory: async (
                configService: ConfigService,
            ): Promise<Octokit | null> => {
                const logger = new Logger('GitHubAppClientModule');

                const clientId =
                    configService.get<string>('githubApp.clientId');
                const installationId = configService.get<string>(
                    'githubApp.installationId',
                );
                const encodedPrivateKey = configService.get<string>(
                    'githubApp.privateKey',
                );

                if (!clientId || !installationId || !encodedPrivateKey) {
                    logger.warn(
                        'No githubApp config present; the in-house classroom GitHub client is disabled.',
                    );
                    return null;
                }

                // Both packages are ESM-only, so they cannot be `import`ed from
                // this CommonJS build. Same dynamic-import shim the Classroom
                // client module uses.
                const [{ Octokit }, { createAppAuth }] = await Promise.all([
                    new Function('return import("@octokit/rest")')() as Promise<
                        typeof import('@octokit/rest')
                    >,
                    new Function(
                        'return import("@octokit/auth-app")',
                    )() as Promise<typeof import('@octokit/auth-app')>,
                ]);

                const privateKey = Buffer.from(
                    encodedPrivateKey,
                    'base64',
                ).toString('utf8');
                if (!privateKey.includes('PRIVATE KEY')) {
                    // Loud, but not fatal. The example config ships a
                    // placeholder here so a developer with no registered App
                    // can boot; refusing to start the whole API over one
                    // optional feature would be the wrong trade. The first
                    // actual use fails with a clear error instead.
                    logger.error(
                        'githubApp.privateKey is not a base64-encoded PEM; the in-house classroom GitHub client is disabled.',
                    );
                    return null;
                }

                const octokit = new Octokit({
                    authStrategy: createAppAuth,
                    // `appId` is the strategy's name for the JWT `iss` claim,
                    // which it passes through verbatim. GitHub accepts either
                    // the Client ID or the numeric App ID there and recommends
                    // the former, so this is a Client ID despite the key name.
                    auth: { appId: clientId, privateKey, installationId },
                });

                // Every response carries the remaining budget. Surfacing it here
                // means no call site has to remember to check.
                octokit.hook.after('request', (response) => {
                    const remaining = Number(
                        response.headers['x-ratelimit-remaining'],
                    );
                    const limit = Number(response.headers['x-ratelimit-limit']);
                    if (
                        !Number.isFinite(remaining) ||
                        !Number.isFinite(limit)
                    ) {
                        return;
                    }
                    if (remaining < limit * RATE_LIMIT_WARN_FRACTION) {
                        logger.warn(
                            `GitHub App rate limit low: ${remaining}/${limit} remaining`,
                        );
                    }
                });

                return octokit;
            },
        },
        GitHubAppClient,
    ],
    exports: [GitHubAppClient],
})
export class GitHubAppClientModule {}
