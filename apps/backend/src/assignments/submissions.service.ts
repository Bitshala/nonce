import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Cache } from 'cache-manager';
import { Repository } from 'typeorm';
import { AssignmentSubmission } from '@/entities/assignment-submission.entity';
import { User } from '@/entities/user.entity';
import { GitHubAppClient } from '@/github-app/client/github-app.client';
import { BlobContent, RepoTree } from '@/github-app/client/response';
import { AssignmentsService } from '@/assignments/assignments.service';
import { ExerciseScoreWritebackService } from '@/assignments/exercise-score-writeback.service';
import { DbTransactionService } from '@/db-transaction/db-transaction.service';
import { AssignmentStatus, ProvisionStatus } from '@/common/enum';
import {
    CommitConflictResponseDto,
    CreateCommitResponseDto,
    DraftResponseDto,
    RepoFileResponseDto,
    RepoTreeResponseDto,
} from '@/assignments/assignments.response.dto';
import { CreateCommitRequestDto } from '@/assignments/assignments.request.dto';
import {
    isProtectedPath,
    normalizeRepoPath,
    validateCommitPaths,
} from '@/assignments/path.util';

/** GitHub truncates huge trees; we cap before that bites the UI. */
const MAX_TREE_ENTRIES = 2000;

/** Above this a file is metadata-only — the editor cannot usefully open it. */
const MAX_EDITABLE_FILE_BYTES = 1024 * 1024;

/** Blobs and trees are content-addressed, so cached entries never go stale. */
const IMMUTABLE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Drafts are a crash-safety net between saves, not a durable artifact. */
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

/** Blob creation fan-out. Bounded so one save cannot monopolise the rate limit. */
const BLOB_CONCURRENCY = 8;

interface DraftEnvelope {
    content: string;
    savedAt: string;
}

/**
 * Reading and writing the files of one submission.
 *
 * `POST /commit` is the only way anything reaches a student repository — no
 * student holds credentials for it — so the validation here is a guarantee
 * rather than defence in depth.
 */
@Injectable()
export class SubmissionsService {
    private readonly logger = new Logger(SubmissionsService.name);

    constructor(
        @InjectRepository(AssignmentSubmission)
        private readonly submissionRepository: Repository<AssignmentSubmission>,
        private readonly gitHubAppClient: GitHubAppClient,
        private readonly assignmentsService: AssignmentsService,
        private readonly scoreWriteback: ExerciseScoreWritebackService,
        private readonly dbTransactionService: DbTransactionService,
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    ) {}

    async getTree(
        submissionId: string,
        ref: string | undefined,
        user: User,
    ): Promise<RepoTreeResponseDto> {
        const submission = await this.loadReadySubmission(submissionId, user);
        const { owner, repo } = this.repoOf(submission);

        const commitSha = await this.resolveRef(submission, ref);
        const commit = await this.gitHubAppClient.getCommit(
            owner,
            repo,
            commitSha,
        );
        const tree = await this.readTreeCached(owner, repo, commit.treeSha);

        const entries = tree.entries
            .slice(0, MAX_TREE_ENTRIES)
            .map((entry) => ({
                path: entry.path,
                type: entry.type,
                sha: entry.sha,
                size: entry.size,
            }));

        return new RepoTreeResponseDto({
            commitSha,
            treeSha: commit.treeSha,
            truncated: tree.truncated || tree.entries.length > MAX_TREE_ENTRIES,
            entries,
        });
    }

    async getFile(
        submissionId: string,
        path: string,
        ref: string | undefined,
        user: User,
    ): Promise<RepoFileResponseDto> {
        const submission = await this.loadReadySubmission(submissionId, user);
        const { owner, repo } = this.repoOf(submission);

        const normalized = normalizeRepoPath(path);
        if ('reason' in normalized) {
            throw new BadRequestException(
                `Invalid path "${path}": ${normalized.reason}`,
            );
        }

        const commitSha = await this.resolveRef(submission, ref);
        const commit = await this.gitHubAppClient.getCommit(
            owner,
            repo,
            commitSha,
        );
        const tree = await this.readTreeCached(owner, repo, commit.treeSha);

        const entry = tree.entries.find(
            (candidate) =>
                candidate.path === normalized.path && candidate.type === 'blob',
        );
        if (!entry) {
            throw new NotFoundException(`No file at "${normalized.path}"`);
        }

        const isProtected = isProtectedPath(
            normalized.path,
            submission.assignment.protectedPaths,
        );
        const tooLarge =
            entry.size !== null && entry.size > MAX_EDITABLE_FILE_BYTES;

        if (tooLarge) {
            return new RepoFileResponseDto({
                path: normalized.path,
                sha: entry.sha,
                commitSha,
                size: entry.size,
                content: null,
                editable: false,
                binary: false,
                protected: isProtected,
            });
        }

        const blob = await this.readBlobCached(owner, repo, entry.sha);
        const raw = Buffer.from(blob.content, 'base64');
        const binary = isBinary(raw);

        return new RepoFileResponseDto({
            path: normalized.path,
            sha: entry.sha,
            commitSha,
            size: blob.size ?? entry.size,
            content: binary ? null : raw.toString('utf8'),
            editable: !binary && !isProtected,
            binary,
            protected: isProtected,
        });
    }

    /**
     * One save is exactly one commit, built with the Git Data API and landed
     * with a compare-and-swap on the branch ref. That last step is what gives
     * optimistic concurrency without a lock.
     */
    async commit(
        submissionId: string,
        request: CreateCommitRequestDto,
        user: User,
    ): Promise<CreateCommitResponseDto> {
        const submission = await this.loadReadySubmission(submissionId, user);
        this.assertWritable(submission);

        const { owner, repo } = this.repoOf(submission);
        const branch = submission.defaultBranch;
        const deletedPaths = request.deletedPaths ?? [];

        const files = request.files.map((file) => ({
            ...file,
            byteLength:
                file.encoding === 'base64'
                    ? Buffer.from(file.content, 'base64').byteLength
                    : Buffer.byteLength(file.content, 'utf8'),
        }));

        const { normalized, violations } = validateCommitPaths({
            files,
            deletedPaths,
            protectedPaths: submission.assignment.protectedPaths,
        });
        if (violations.length > 0) {
            throw new UnprocessableEntityException({
                message: 'One or more paths were rejected',
                violations,
            });
        }

        const head = await this.gitHubAppClient.getBranchHead(
            owner,
            repo,
            branch,
        );
        if (!head) {
            throw new NotFoundException(
                `Branch ${branch} does not exist on ${owner}/${repo}`,
            );
        }
        if (head !== request.baseCommitSha) {
            throw new ConflictException(
                await this.buildConflict(
                    owner,
                    repo,
                    request.baseCommitSha,
                    head,
                ),
            );
        }

        const baseCommit = await this.gitHubAppClient.getCommit(
            owner,
            repo,
            request.baseCommitSha,
        );

        const blobs = await this.createBlobs(owner, repo, files, normalized);
        const treeSha = await this.gitHubAppClient.createTree({
            owner,
            repo,
            baseTreeSha: baseCommit.treeSha,
            files: blobs,
            deletedPaths: deletedPaths.map((path) => normalized.get(path)!),
        });

        // An unchanged save produces the same tree. Skipping the write keeps
        // empty commits out of the history.
        if (treeSha === baseCommit.treeSha) {
            return new CreateCommitResponseDto(
                request.baseCommitSha,
                treeSha,
                false,
            );
        }

        const commitSha = await this.gitHubAppClient.createCommit({
            owner,
            repo,
            message: request.message?.trim() || 'Save from editor',
            treeSha,
            parentSha: request.baseCommitSha,
            author: {
                name: user.name ?? user.discordUserName,
                // Students have no GitHub account here, so commits carry a
                // stable synthetic address rather than a real one.
                email: `${user.id}@classroom.bitshala.org`,
            },
        });

        const landed = await this.gitHubAppClient.updateBranchHead({
            owner,
            repo,
            branch,
            sha: commitSha,
        });
        if (!landed) {
            const current = await this.gitHubAppClient.getBranchHead(
                owner,
                repo,
                branch,
            );
            throw new ConflictException(
                await this.buildConflict(
                    owner,
                    repo,
                    request.baseCommitSha,
                    current ?? request.baseCommitSha,
                ),
            );
        }

        await this.recordCommit(submission, commitSha);

        return new CreateCommitResponseDto(commitSha, treeSha, true);
    }

    async saveDraft(
        submissionId: string,
        path: string,
        content: string,
        user: User,
    ): Promise<DraftResponseDto> {
        const submission = await this.loadReadySubmission(submissionId, user);

        const normalized = normalizeRepoPath(path);
        if ('reason' in normalized) {
            throw new BadRequestException(
                `Invalid path "${path}": ${normalized.reason}`,
            );
        }

        const savedAt = new Date().toISOString();
        await this.cacheManager.set(
            draftKey(submission.id, normalized.path),
            { content, savedAt } satisfies DraftEnvelope,
            DRAFT_TTL_MS,
        );

        return new DraftResponseDto(normalized.path, content, savedAt);
    }

    async getDraft(
        submissionId: string,
        path: string,
        user: User,
    ): Promise<DraftResponseDto | null> {
        const submission = await this.loadReadySubmission(submissionId, user);

        const normalized = normalizeRepoPath(path);
        if ('reason' in normalized) {
            throw new BadRequestException(
                `Invalid path "${path}": ${normalized.reason}`,
            );
        }

        const draft = await this.cacheManager.get<DraftEnvelope>(
            draftKey(submission.id, normalized.path),
        );
        if (!draft) return null;

        return new DraftResponseDto(
            normalized.path,
            draft.content,
            draft.savedAt,
        );
    }

    /** The repo as a zip. This is how students keep their work (§8.6). */
    async downloadArchive(
        submissionId: string,
        user: User,
    ): Promise<{ buffer: Buffer; filename: string }> {
        const submission = await this.loadReadySubmission(submissionId, user);
        const { owner, repo } = this.repoOf(submission);
        const ref = submission.lastCommitSha ?? submission.defaultBranch;

        const buffer = await this.gitHubAppClient.downloadZipball(
            owner,
            repo,
            ref,
        );
        return { buffer, filename: `${repo}.zip` };
    }

    /**
     * Loads a submission the caller may touch and whose repo actually exists.
     * Every file endpoint goes through here.
     */
    async loadReadySubmission(
        submissionId: string,
        user: User,
    ): Promise<AssignmentSubmission> {
        const submission =
            await this.assignmentsService.resolveSubmissionForViewer(
                submissionId,
                user,
            );

        if (submission.provisionStatus !== ProvisionStatus.READY) {
            throw new ConflictException(
                `This assignment repository is not ready yet (${submission.provisionStatus})`,
            );
        }
        return submission;
    }

    private assertWritable(submission: AssignmentSubmission): void {
        const assignment = submission.assignment;

        if (assignment.status === AssignmentStatus.CLOSED) {
            throw new ForbiddenException('This assignment is closed.');
        }
        // Past the deadline, saving is still allowed by default so students can
        // keep practising. Scoring is gated separately, at dispatch time.
        if (assignment.isPastDeadline() && !assignment.allowLateSubmission) {
            throw new ForbiddenException(
                'The deadline for this assignment has passed.',
            );
        }
    }

    private repoOf(submission: AssignmentSubmission): {
        owner: string;
        repo: string;
    } {
        if (!submission.repoOwner || !submission.repoName) {
            throw new ConflictException(
                'This submission has no repository yet',
            );
        }
        return { owner: submission.repoOwner, repo: submission.repoName };
    }

    /** A ref is a commit SHA if it looks like one, otherwise a branch name. */
    private async resolveRef(
        submission: AssignmentSubmission,
        ref: string | undefined,
    ): Promise<string> {
        const { owner, repo } = this.repoOf(submission);
        const target = ref?.trim() || submission.defaultBranch;

        if (/^[0-9a-f]{40}$/.test(target)) return target;

        const head = await this.gitHubAppClient.getBranchHead(
            owner,
            repo,
            target,
        );
        if (!head) {
            throw new NotFoundException(`Unknown ref "${target}"`);
        }
        return head;
    }

    private async readTreeCached(
        owner: string,
        repo: string,
        treeSha: string,
    ): Promise<RepoTree> {
        const key = `gh:tree:${owner}/${repo}:${treeSha}`;
        const cached = await this.cacheManager.get<RepoTree>(key);
        if (cached) return cached;

        const tree = await this.gitHubAppClient.getTree(owner, repo, treeSha);
        await this.cacheManager.set(key, tree, IMMUTABLE_CACHE_TTL_MS);
        return tree;
    }

    private async readBlobCached(
        owner: string,
        repo: string,
        sha: string,
    ): Promise<BlobContent> {
        const key = `gh:blob:${owner}/${repo}:${sha}`;
        const cached = await this.cacheManager.get<BlobContent>(key);
        if (cached) return cached;

        const blob = await this.gitHubAppClient.getBlob(owner, repo, sha);
        await this.cacheManager.set(key, blob, IMMUTABLE_CACHE_TTL_MS);
        return blob;
    }

    private async createBlobs(
        owner: string,
        repo: string,
        files: {
            path: string;
            content: string;
            encoding: 'utf-8' | 'base64';
        }[],
        normalized: Map<string, string>,
    ): Promise<{ path: string; sha: string }[]> {
        const created: { path: string; sha: string }[] = [];

        for (let i = 0; i < files.length; i += BLOB_CONCURRENCY) {
            const chunk = files.slice(i, i + BLOB_CONCURRENCY);
            const shas = await Promise.all(
                chunk.map((file) =>
                    this.gitHubAppClient.createBlob(
                        owner,
                        repo,
                        file.content,
                        file.encoding,
                    ),
                ),
            );
            chunk.forEach((file, index) => {
                created.push({
                    path: normalized.get(file.path)!,
                    sha: shas[index],
                });
            });
        }

        return created;
    }

    /**
     * Names the paths that differ between what the editor loaded and what the
     * branch actually holds, so the frontend can show a real diff rather than
     * just "someone else changed something".
     */
    private async buildConflict(
        owner: string,
        repo: string,
        baseCommitSha: string,
        currentCommitSha: string,
    ): Promise<CommitConflictResponseDto> {
        let changedPaths: string[] = [];
        try {
            const [base, current] = await Promise.all([
                this.gitHubAppClient.getCommit(owner, repo, baseCommitSha),
                this.gitHubAppClient.getCommit(owner, repo, currentCommitSha),
            ]);
            const [baseTree, currentTree] = await Promise.all([
                this.readTreeCached(owner, repo, base.treeSha),
                this.readTreeCached(owner, repo, current.treeSha),
            ]);

            const baseByPath = new Map(
                baseTree.entries.map((e) => [e.path, e.sha]),
            );
            const currentByPath = new Map(
                currentTree.entries.map((e) => [e.path, e.sha]),
            );

            const paths = new Set([
                ...baseByPath.keys(),
                ...currentByPath.keys(),
            ]);
            changedPaths = [...paths].filter(
                (path) => baseByPath.get(path) !== currentByPath.get(path),
            );
        } catch (error) {
            // The conflict itself is the useful signal; failing to enumerate
            // paths must not turn a 409 into a 500.
            this.logger.warn(
                `Could not diff ${baseCommitSha}..${currentCommitSha}: ${error instanceof Error ? error.message : error}`,
            );
        }

        return new CommitConflictResponseDto(
            currentCommitSha,
            baseCommitSha,
            changedPaths,
        );
    }

    /**
     * Records the new head and refreshes the score. A student who saves but
     * never runs still earns the submission points.
     */
    private async recordCommit(
        submission: AssignmentSubmission,
        commitSha: string,
    ): Promise<void> {
        await this.dbTransactionService.execute(async (manager) => {
            await manager.update(
                AssignmentSubmission,
                { id: submission.id },
                { lastCommitSha: commitSha, lastCommitAt: new Date() },
            );

            await this.scoreWriteback.sync(manager, submission.id);
        });
    }
}

function draftKey(submissionId: string, path: string): string {
    return `draft:${submissionId}:${path}`;
}

/**
 * A NUL byte in the first block is the same heuristic git uses. Cheap, and
 * wrong only for files no editor could show anyway.
 */
function isBinary(buffer: Buffer): boolean {
    const window = buffer.subarray(0, 8000);
    return window.includes(0);
}
