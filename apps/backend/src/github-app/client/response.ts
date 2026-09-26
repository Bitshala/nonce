/**
 * Hand-written shapes for the subset of the GitHub REST API the in-house
 * classroom uses. Mirrors the convention in the Classroom client: the client
 * narrows Octokit's very wide response types down to what callers actually
 * consume, so a field rename upstream surfaces in one place.
 */

export interface RepoDetails {
    owner: string;
    name: string;
    nodeId: string;
    defaultBranch: string;
    htmlUrl: string;
    isPrivate: boolean;
}

export interface TreeEntry {
    path: string;
    /** `blob` for a file, `tree` for a directory. */
    type: string;
    sha: string;
    mode: string;
    size: number | null;
}

export interface RepoTree {
    sha: string;
    /** GitHub caps a tree response; anything beyond the cap is missing. */
    truncated: boolean;
    entries: TreeEntry[];
}

export interface BlobContent {
    sha: string;
    /** GitHub types this nullable; treat null as "size unknown". */
    size: number | null;
    encoding: string;
    /** Raw, still in whatever `encoding` says — usually base64. */
    content: string;
}

export interface CommitRef {
    sha: string;
    treeSha: string;
}

export interface WorkflowRunSummary {
    id: number;
    runAttempt: number;
    /** `queued` | `in_progress` | `completed` | … */
    status: string | null;
    /** `success` | `failure` | `cancelled` | `timed_out` | … */
    conclusion: string | null;
    /** Carries the `run-name:` the workflow declares — our correlation handle. */
    displayTitle: string;
    htmlUrl: string;
    createdAt: string;
    runStartedAt: string | null;
    updatedAt: string;
}

export interface WorkflowJobStep {
    name: string;
    status: string;
    conclusion: string | null;
    number: number;
}

export interface WorkflowJobSummary {
    id: number;
    name: string;
    status: string;
    conclusion: string | null;
    startedAt: string | null;
    completedAt: string | null;
    steps: WorkflowJobStep[];
}

export interface ArtifactSummary {
    id: number;
    name: string;
    sizeInBytes: number;
    expired: boolean;
}

export interface RateLimitSnapshot {
    limit: number;
    remaining: number;
    resetAt: Date;
}

/** One file in a commit built through the Git Data API. */
export interface CommitFile {
    path: string;
    /** Blob SHA produced by `createBlob`. */
    sha: string;
}

export interface CommitAuthor {
    name: string;
    email: string;
}
