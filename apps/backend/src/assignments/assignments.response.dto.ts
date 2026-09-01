import type {
    AdminSubmissionResponse,
    AssignmentDetailResponse,
    AssignmentSummaryResponse,
    ArchiveAssignmentResponse,
    CIRunDetailResponse,
    CIRunJobResponse,
    CIRunLogResponse,
    CIRunSummaryResponse,
    CohortWeekExercise,
    CommitConflictResponse,
    CreateCommitResponse,
    DraftResponse,
    GradingReportResponse,
    RegradeResponse,
    RepoFileResponse,
    RepoTreeEntryResponse,
    RepoTreeResponse,
    SubmissionResponse,
    SyncAssignmentsResponse,
} from '@nonce/shared';
import {
    AssignmentStatus,
    CIRunConclusion,
    CIRunStatus,
    CohortType,
    ProvisionStatus,
} from '@/common/enum';
import { Assignment } from '@/entities/assignment.entity';
import { AssignmentSubmission } from '@/entities/assignment-submission.entity';
import { CIRun } from '@/entities/ci-run.entity';
import { CIRunLog } from '@/entities/ci-run-log.entity';
import { ExerciseScore } from '@/entities/exercise-score.entity';

export class CIRunSummaryResponseDto implements CIRunSummaryResponse {
    id: string;
    commitSha: string;
    status: CIRunStatus;
    conclusion: CIRunConclusion | null;
    countsForScore: boolean;
    testsPassed: number | null;
    testsTotal: number | null;
    dispatchedAt: string;
    startedAt: string | null;
    completedAt: string | null;

    constructor(run: CIRun) {
        this.id = run.id;
        this.commitSha = run.commitSha;
        this.status = run.status;
        this.conclusion = run.conclusion;
        this.countsForScore = run.countsForScore;
        this.testsPassed = run.testsPassed;
        this.testsTotal = run.testsTotal;
        this.dispatchedAt = run.dispatchedAt.toISOString();
        this.startedAt = run.startedAt?.toISOString() ?? null;
        this.completedAt = run.completedAt?.toISOString() ?? null;
    }
}

export class CIRunDetailResponseDto
    extends CIRunSummaryResponseDto
    implements CIRunDetailResponse
{
    jobs: CIRunJobResponse[];
    report: GradingReportResponse | null;
    githubRunUrl: string | null;
    hasLogs: boolean;

    constructor(run: CIRun, repoFullName: string | null, hasLogs: boolean) {
        super(run);
        this.jobs = run.jobs ?? [];
        this.report = run.report;
        this.githubRunUrl =
            run.githubRunId && repoFullName
                ? `https://github.com/${repoFullName}/actions/runs/${run.githubRunId}`
                : null;
        this.hasLogs = hasLogs;
    }
}

export class CIRunLogResponseDto implements CIRunLogResponse {
    content: string;
    sizeBytes: number;
    truncated: boolean;

    constructor(log: CIRunLog) {
        this.content = log.content;
        this.sizeBytes = log.sizeBytes;
        this.truncated = log.truncated;
    }
}

export class SubmissionResponseDto implements SubmissionResponse {
    id: string;
    assignmentId: string;
    provisionStatus: ProvisionStatus;
    provisionError: string | null;
    repoHtmlUrl: string | null;
    defaultBranch: string;
    acceptedAt: string;
    lastCommitSha: string | null;
    lastCommitAt: string | null;
    hasStudentCommits: boolean;
    latestRun: CIRunSummaryResponse | null;
    bestRun: CIRunSummaryResponse | null;
    runsToday: number;

    constructor(
        submission: AssignmentSubmission,
        assignmentId: string,
        runsToday = 0,
    ) {
        this.id = submission.id;
        this.assignmentId = assignmentId;
        this.provisionStatus = submission.provisionStatus;
        this.provisionError = submission.provisionError;
        this.repoHtmlUrl = submission.repoHtmlUrl;
        this.defaultBranch = submission.defaultBranch;
        this.acceptedAt = submission.acceptedAt.toISOString();
        this.lastCommitSha = submission.lastCommitSha;
        this.lastCommitAt = submission.lastCommitAt?.toISOString() ?? null;
        this.hasStudentCommits = submission.hasStudentCommits;
        this.latestRun = submission.latestRun
            ? new CIRunSummaryResponseDto(submission.latestRun)
            : null;
        this.bestRun = submission.bestRun
            ? new CIRunSummaryResponseDto(submission.bestRun)
            : null;
        this.runsToday = runsToday;
    }
}

export class AdminSubmissionResponseDto
    extends SubmissionResponseDto
    implements AdminSubmissionResponse
{
    userId: string;
    userName: string | null;
    repoFullName: string | null;
    isSubmitted: boolean;
    isPassing: boolean;

    constructor(
        submission: AssignmentSubmission,
        assignmentId: string,
        score: ExerciseScore | null,
    ) {
        super(submission, assignmentId);
        this.userId = submission.user.id;
        this.userName = submission.user.name;
        this.repoFullName = submission.repoFullName;
        this.isSubmitted = score?.isSubmitted ?? false;
        this.isPassing = score?.isPassing ?? false;
    }
}

export class AssignmentSummaryResponseDto implements AssignmentSummaryResponse {
    id: string;
    slug: string;
    status: AssignmentStatus;
    cohortId: string;
    cohortType: CohortType;
    cohortSeason: number;
    cohortWeekId: string;
    weekNumber: number;
    title: string | null;
    deadline: string | null;
    allowLateSubmission: boolean;
    isPastDeadline: boolean;
    maxRunsPerDay: number;
    submission: SubmissionResponse | null;

    /**
     * Requires `assignment.cohortWeek.cohort` to be loaded — the response
     * carries cohort identity so the frontend can render "my assignments"
     * across cohorts without a second lookup.
     */
    constructor(
        assignment: Assignment,
        submission: AssignmentSubmission | null,
        runsToday = 0,
    ) {
        const week = assignment.cohortWeek;
        this.id = assignment.id;
        this.slug = assignment.slug;
        this.status = assignment.status;
        this.cohortId = week.cohort.id;
        this.cohortType = week.cohort.type;
        this.cohortSeason = week.cohort.season;
        this.cohortWeekId = week.id;
        this.weekNumber = week.week;
        this.title = week.exercise?.title ?? week.title ?? null;
        this.deadline = assignment.deadline?.toISOString() ?? null;
        this.allowLateSubmission = assignment.allowLateSubmission;
        this.isPastDeadline = assignment.isPastDeadline();
        this.maxRunsPerDay = assignment.maxRunsPerDay;
        this.submission = submission
            ? new SubmissionResponseDto(submission, assignment.id, runsToday)
            : null;
    }
}

export class AssignmentDetailResponseDto
    extends AssignmentSummaryResponseDto
    implements AssignmentDetailResponse
{
    exercise: CohortWeekExercise | null;
    protectedPaths: string[];
    runTimeoutMinutes: number;

    constructor(
        assignment: Assignment,
        submission: AssignmentSubmission | null,
        runsToday = 0,
    ) {
        super(assignment, submission, runsToday);
        this.exercise = assignment.cohortWeek.exercise;
        this.protectedPaths = assignment.protectedPaths;
        this.runTimeoutMinutes = assignment.runTimeoutMinutes;
    }
}

export class RepoTreeResponseDto implements RepoTreeResponse {
    commitSha: string;
    treeSha: string;
    truncated: boolean;
    entries: RepoTreeEntryResponse[];

    constructor(shape: RepoTreeResponse) {
        this.commitSha = shape.commitSha;
        this.treeSha = shape.treeSha;
        this.truncated = shape.truncated;
        this.entries = shape.entries;
    }
}

export class RepoFileResponseDto implements RepoFileResponse {
    path: string;
    sha: string;
    commitSha: string;
    size: number | null;
    content: string | null;
    editable: boolean;
    binary: boolean;
    protected: boolean;

    constructor(shape: RepoFileResponse) {
        this.path = shape.path;
        this.sha = shape.sha;
        this.commitSha = shape.commitSha;
        this.size = shape.size;
        this.content = shape.content;
        this.editable = shape.editable;
        this.binary = shape.binary;
        this.protected = shape.protected;
    }
}

export class CreateCommitResponseDto implements CreateCommitResponse {
    commitSha: string;
    treeSha: string;
    changed: boolean;

    constructor(commitSha: string, treeSha: string, changed: boolean) {
        this.commitSha = commitSha;
        this.treeSha = treeSha;
        this.changed = changed;
    }
}

export class CommitConflictResponseDto implements CommitConflictResponse {
    currentCommitSha: string;
    baseCommitSha: string;
    changedPaths: string[];

    constructor(
        currentCommitSha: string,
        baseCommitSha: string,
        changedPaths: string[],
    ) {
        this.currentCommitSha = currentCommitSha;
        this.baseCommitSha = baseCommitSha;
        this.changedPaths = changedPaths;
    }
}

export class DraftResponseDto implements DraftResponse {
    path: string;
    content: string;
    savedAt: string;

    constructor(path: string, content: string, savedAt: string) {
        this.path = path;
        this.content = content;
        this.savedAt = savedAt;
    }
}

export class SyncAssignmentsResponseDto implements SyncAssignmentsResponse {
    created: number;
    updated: number;

    constructor(created: number, updated: number) {
        this.created = created;
        this.updated = updated;
    }
}

export class RegradeResponseDto implements RegradeResponse {
    dispatched: number;
    skipped: number;

    constructor(dispatched: number, skipped: number) {
        this.dispatched = dispatched;
        this.skipped = skipped;
    }
}

export class ArchiveAssignmentResponseDto implements ArchiveAssignmentResponse {
    archived: number;
    failed: number;

    constructor(archived: number, failed: number) {
        this.archived = archived;
        this.failed = failed;
    }
}
