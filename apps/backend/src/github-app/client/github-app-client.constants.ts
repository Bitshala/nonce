// Resolves to `Octokit | null` — null when no `githubApp` config block is
// present, so a developer without a registered App can still boot the backend.
export const GITHUB_APP_OCTOKIT_INJECTION_TOKEN = 'GITHUB_APP_OCTOKIT';
