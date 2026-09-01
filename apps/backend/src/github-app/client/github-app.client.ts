import { Inject, Injectable } from '@nestjs/common';
import type { Octokit } from '@octokit/rest';
import { GITHUB_APP_OCTOKIT_INJECTION_TOKEN } from '@/github-app/client/github-app-client.constants';
import { ServiceError } from '@/common/errors';
import {
    ArtifactSummary,
    BlobContent,
    CommitAuthor,
    CommitFile,
    CommitRef,
    RateLimitSnapshot,
    RepoDetails,
    RepoTree,
    WorkflowJobSummary,
    WorkflowRunSummary,
} from '@/github-app/client/response';

/** Blob mode for a plain, non-executable file. */
const FILE_MODE = '100644';

/**
 * Everything the in-house classroom does on GitHub, spoken as the App
 * installation. No student ever holds credentials for any of these repos
 * (design §5.2), so this client is the only writer.
 */
@Injectable()
export class GitHubAppClient {
    constructor(
        @Inject(GITHUB_APP_OCTOKIT_INJECTION_TOKEN)
        private readonly maybeOctokit: Octokit | null,
    ) {}

    /**
     * Whether the App is configured. Callers that can degrade gracefully should
     * check this instead of catching the error from a failed call.
     */
    get isConfigured(): boolean {
        return this.maybeOctokit !== null;
    }

    private get octokit(): Octokit {
        if (!this.maybeOctokit) {
            throw new ServiceError(
                'GitHub App is not configured; set the `githubApp` config block',
            );
        }
        return this.maybeOctokit;
    }

    // --- Repositories ----------------------------------------------------

    /** Instantiates a private, org-owned repo from a template. */
    async createRepoFromTemplate(params: {
        templateOwner: string;
        templateRepo: string;
        owner: string;
        name: string;
        description?: string;
    }): Promise<RepoDetails> {
        const res = await this.octokit.rest.repos.createUsingTemplate({
            template_owner: params.templateOwner,
            template_repo: params.templateRepo,
            owner: params.owner,
            name: params.name,
            description: params.description,
            private: true,
            include_all_branches: false,
        });

        return this.toRepoDetails(res.data);
    }

    /** Resolves false on 404 so callers can distinguish "absent" from "failed". */
    async getRepo(owner: string, repo: string): Promise<RepoDetails | null> {
        try {
            const res = await this.octokit.rest.repos.get({ owner, repo });
            return this.toRepoDetails(res.data);
        } catch (err) {
            if ((err as { status?: number }).status === 404) return null;
            throw err;
        }
    }

    async archiveRepo(owner: string, repo: string): Promise<void> {
        await this.octokit.rest.repos.update({ owner, repo, archived: true });
    }

    /** Streams the repo as a zip. Used for the end-of-cohort export (§8.6). */
    async downloadZipball(
        owner: string,
        repo: string,
        ref: string,
    ): Promise<Buffer> {
        const res = await this.octokit.request(
            'GET /repos/{owner}/{repo}/zipball/{ref}',
            { owner, repo, ref },
        );
        return Buffer.from(res.data as ArrayBuffer);
    }

    private toRepoDetails(data: {
        owner: { login: string };
        name: string;
        node_id: string;
        default_branch?: string;
        html_url: string;
        private: boolean;
    }): RepoDetails {
        return {
            owner: data.owner.login,
            name: data.name,
            nodeId: data.node_id,
            defaultBranch: data.default_branch ?? 'main',
            htmlUrl: data.html_url,
            isPrivate: data.private,
        };
    }

    // --- Git data --------------------------------------------------------

    /** Current commit SHA of a branch. Null when the branch does not exist yet. */
    async getBranchHead(
        owner: string,
        repo: string,
        branch: string,
    ): Promise<string | null> {
        try {
            const res = await this.octokit.rest.git.getRef({
                owner,
                repo,
                ref: `heads/${branch}`,
            });
            return res.data.object.sha;
        } catch (err) {
            if ((err as { status?: number }).status === 404) return null;
            throw err;
        }
    }

    async getCommit(
        owner: string,
        repo: string,
        commitSha: string,
    ): Promise<CommitRef> {
        const res = await this.octokit.rest.git.getCommit({
            owner,
            repo,
            commit_sha: commitSha,
        });
        return { sha: res.data.sha, treeSha: res.data.tree.sha };
    }

    /** Whole tree in one request. Trees are immutable, so this is cacheable by SHA. */
    async getTree(
        owner: string,
        repo: string,
        treeSha: string,
    ): Promise<RepoTree> {
        const res = await this.octokit.rest.git.getTree({
            owner,
            repo,
            tree_sha: treeSha,
            recursive: '1',
        });

        return {
            sha: res.data.sha,
            truncated: res.data.truncated === true,
            entries: res.data.tree.map((entry) => ({
                path: entry.path ?? '',
                type: entry.type ?? 'blob',
                sha: entry.sha ?? '',
                mode: entry.mode ?? FILE_MODE,
                size: entry.size ?? null,
            })),
        };
    }

    /** Blobs are immutable and therefore cacheable by SHA. */
    async getBlob(
        owner: string,
        repo: string,
        fileSha: string,
    ): Promise<BlobContent> {
        const res = await this.octokit.rest.git.getBlob({
            owner,
            repo,
            file_sha: fileSha,
        });
        return {
            sha: res.data.sha,
            size: res.data.size,
            encoding: res.data.encoding,
            content: res.data.content,
        };
    }

    async createBlob(
        owner: string,
        repo: string,
        content: string,
        encoding: 'utf-8' | 'base64',
    ): Promise<string> {
        const res = await this.octokit.rest.git.createBlob({
            owner,
            repo,
            content,
            encoding,
        });
        return res.data.sha;
    }

    /**
     * Builds a tree on top of `baseTreeSha`. Paths in `deletedPaths` are sent
     * with a null SHA, which is how the Git Data API expresses a deletion.
     */
    async createTree(params: {
        owner: string;
        repo: string;
        baseTreeSha: string;
        files: CommitFile[];
        deletedPaths: string[];
    }): Promise<string> {
        const tree = [
            ...params.files.map((file) => ({
                path: file.path,
                mode: FILE_MODE as '100644',
                type: 'blob' as const,
                sha: file.sha,
            })),
            ...params.deletedPaths.map((path) => ({
                path,
                mode: FILE_MODE as '100644',
                type: 'blob' as const,
                sha: null,
            })),
        ];

        const res = await this.octokit.rest.git.createTree({
            owner: params.owner,
            repo: params.repo,
            base_tree: params.baseTreeSha,
            tree,
        });
        return res.data.sha;
    }

    /**
     * The App is always the committer; `author` is the student, so `git log`
     * reads sensibly even though the student holds no GitHub account here.
     */
    async createCommit(params: {
        owner: string;
        repo: string;
        message: string;
        treeSha: string;
        parentSha: string;
        author: CommitAuthor;
    }): Promise<string> {
        const res = await this.octokit.rest.git.createCommit({
            owner: params.owner,
            repo: params.repo,
            message: params.message,
            tree: params.treeSha,
            parents: [params.parentSha],
            author: { name: params.author.name, email: params.author.email },
        });
        return res.data.sha;
    }

    /**
     * Compare-and-swap on the branch head. With `force: false` GitHub rejects a
     * non-fast-forward update, which is what gives save optimistic concurrency
     * without a lock (§8.3). Resolves false when the update is rejected.
     */
    async updateBranchHead(params: {
        owner: string;
        repo: string;
        branch: string;
        sha: string;
    }): Promise<boolean> {
        try {
            await this.octokit.rest.git.updateRef({
                owner: params.owner,
                repo: params.repo,
                ref: `heads/${params.branch}`,
                sha: params.sha,
                force: false,
            });
            return true;
        } catch (err) {
            const status = (err as { status?: number }).status;
            if (status === 422 || status === 409) return false;
            throw err;
        }
    }

    // --- Actions ---------------------------------------------------------

    /**
     * Fire-and-forget: `workflow_dispatch` returns 204 with no body, so the run
     * id has to be recovered afterwards by matching the correlation token in
     * the run's display title (§8.4).
     */
    async dispatchWorkflow(params: {
        owner: string;
        repo: string;
        workflowFile: string;
        ref: string;
        inputs: Record<string, string>;
    }): Promise<void> {
        await this.octokit.rest.actions.createWorkflowDispatch({
            owner: params.owner,
            repo: params.repo,
            workflow_id: params.workflowFile,
            ref: params.ref,
            inputs: params.inputs,
        });
    }

    /** Recent dispatch-triggered runs, newest first, for correlation. */
    async listRecentDispatchRuns(params: {
        owner: string;
        repo: string;
        workflowFile: string;
        perPage?: number;
    }): Promise<WorkflowRunSummary[]> {
        const res = await this.octokit.rest.actions.listWorkflowRuns({
            owner: params.owner,
            repo: params.repo,
            workflow_id: params.workflowFile,
            event: 'workflow_dispatch',
            per_page: params.perPage ?? 50,
        });
        return res.data.workflow_runs.map((run) => this.toRunSummary(run));
    }

    async getWorkflowRun(
        owner: string,
        repo: string,
        runId: number,
    ): Promise<WorkflowRunSummary | null> {
        try {
            const res = await this.octokit.rest.actions.getWorkflowRun({
                owner,
                repo,
                run_id: runId,
            });
            return this.toRunSummary(res.data);
        } catch (err) {
            if ((err as { status?: number }).status === 404) return null;
            throw err;
        }
    }

    async listRunJobs(
        owner: string,
        repo: string,
        runId: number,
    ): Promise<WorkflowJobSummary[]> {
        const res = await this.octokit.rest.actions.listJobsForWorkflowRun({
            owner,
            repo,
            run_id: runId,
            per_page: 100,
        });
        return res.data.jobs.map((job) => ({
            id: job.id,
            name: job.name,
            status: job.status,
            conclusion: job.conclusion ?? null,
            startedAt: job.started_at ?? null,
            completedAt: job.completed_at ?? null,
            steps: (job.steps ?? []).map((step) => ({
                name: step.name,
                status: step.status,
                conclusion: step.conclusion ?? null,
                number: step.number,
            })),
        }));
    }

    /**
     * Plain text logs for a single job. GitHub answers with a 302 to a
     * short-lived blob URL, which Octokit follows. Returns null once the logs
     * have expired or the job has not produced any yet.
     */
    async getJobLogs(
        owner: string,
        repo: string,
        jobId: number,
    ): Promise<string | null> {
        try {
            const res = await this.octokit.request(
                'GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs',
                { owner, repo, job_id: jobId },
            );
            return typeof res.data === 'string'
                ? res.data
                : Buffer.from(res.data as ArrayBuffer).toString('utf8');
        } catch (err) {
            const status = (err as { status?: number }).status;
            if (status === 404 || status === 410) return null;
            throw err;
        }
    }

    async listRunArtifacts(
        owner: string,
        repo: string,
        runId: number,
    ): Promise<ArtifactSummary[]> {
        const res = await this.octokit.rest.actions.listWorkflowRunArtifacts({
            owner,
            repo,
            run_id: runId,
            per_page: 100,
        });
        return res.data.artifacts.map((artifact) => ({
            id: artifact.id,
            name: artifact.name,
            sizeInBytes: artifact.size_in_bytes,
            expired: artifact.expired,
        }));
    }

    /** The artifact as a zip; the caller unpacks it to read `report.json`. */
    async downloadArtifact(
        owner: string,
        repo: string,
        artifactId: number,
    ): Promise<Buffer> {
        const res = await this.octokit.request(
            'GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}/{archive_format}',
            { owner, repo, artifact_id: artifactId, archive_format: 'zip' },
        );
        return Buffer.from(res.data as ArrayBuffer);
    }

    private toRunSummary(run: {
        id: number;
        run_attempt?: number | null;
        status: string | null;
        conclusion: string | null;
        display_title: string;
        html_url: string;
        created_at: string;
        run_started_at?: string | null;
        updated_at: string;
    }): WorkflowRunSummary {
        return {
            id: run.id,
            runAttempt: run.run_attempt ?? 1,
            status: run.status,
            conclusion: run.conclusion,
            displayTitle: run.display_title,
            htmlUrl: run.html_url,
            createdAt: run.created_at,
            runStartedAt: run.run_started_at ?? null,
            updatedAt: run.updated_at,
        };
    }

    // --- Diagnostics -----------------------------------------------------

    /**
     * The installation's current budget. Used to size the polling design in
     * §9.4 and, later, to alert before the ceiling is reached.
     */
    async getRateLimit(): Promise<RateLimitSnapshot> {
        const res = await this.octokit.rest.rateLimit.get();
        const core = res.data.resources.core;
        return {
            limit: core.limit,
            remaining: core.remaining,
            resetAt: new Date(core.reset * 1000),
        };
    }
}
