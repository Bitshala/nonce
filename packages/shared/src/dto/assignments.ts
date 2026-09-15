import {
  AssignmentStatus,
  CIRunConclusion,
  CIRunStatus,
  CohortType,
  ProvisionStatus,
} from '../enums';
import { CohortWeekExercise } from './cohorts';

// --- Runs ------------------------------------------------------------------

export interface CIRunJobStepResponse {
  name: string;
  status: string;
  conclusion: string | null;
  number: number;
}

/** Per-job checklist, mirrored from GitHub's `workflow_job` events. */
export interface CIRunJobResponse {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  startedAt: string | null;
  completedAt: string | null;
  steps: CIRunJobStepResponse[];
}

export interface GradingReportTestResponse {
  name: string;
  status: string;
  durationMs?: number;
  message?: string;
}

export interface GradingReportResponse {
  schemaVersion: number;
  passed: boolean;
  tests: GradingReportTestResponse[];
}

export interface CIRunSummaryResponse {
  id: string;
  commitSha: string;
  status: CIRunStatus;
  conclusion: CIRunConclusion | null;
  /**
   * False when the run was dispatched after the deadline. Such a run still
   * executes and still shows results, but never changes the score.
   */
  countsForScore: boolean;
  testsPassed: number | null;
  testsTotal: number | null;
  dispatchedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface CIRunDetailResponse extends CIRunSummaryResponse {
  jobs: CIRunJobResponse[];
  report: GradingReportResponse | null;
  /** Null until the dispatch has been correlated to a GitHub run. */
  githubRunUrl: string | null;
  /** True once logs have been captured and `GET /runs/:id/logs` will serve them. */
  hasLogs: boolean;
}

export interface CIRunLogResponse {
  content: string;
  sizeBytes: number;
  truncated: boolean;
}

// --- Submissions -----------------------------------------------------------

export interface SubmissionResponse {
  id: string;
  assignmentId: string;
  provisionStatus: ProvisionStatus;
  provisionError: string | null;
  /** Null until provisioning completes. Students cannot open it — they have no access. */
  repoHtmlUrl: string | null;
  defaultBranch: string;
  acceptedAt: string;
  lastCommitSha: string | null;
  lastCommitAt: string | null;
  /** Whether anything has been committed beyond the template's initial commit. */
  hasStudentCommits: boolean;
  latestRun: CIRunSummaryResponse | null;
  bestRun: CIRunSummaryResponse | null;
  runsToday: number;
}

// --- Assignments -----------------------------------------------------------

export interface AssignmentSummaryResponse {
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
  /** Null until the student accepts. */
  submission: SubmissionResponse | null;
}

export interface AssignmentDetailResponse extends AssignmentSummaryResponse {
  /** The problem statement, which lives on the cohort week, not the assignment. */
  exercise: CohortWeekExercise | null;
  /** Paths the editor must refuse to write. Mirrored so the UI can grey them out. */
  protectedPaths: string[];
  runTimeoutMinutes: number;
}

// --- Editor: read ----------------------------------------------------------

export interface RepoTreeEntryResponse {
  path: string;
  /** `blob` for a file, `tree` for a directory. */
  type: string;
  sha: string;
  size: number | null;
}

export interface RepoTreeResponse {
  commitSha: string;
  treeSha: string;
  /** GitHub caps tree responses; some entries are missing when true. */
  truncated: boolean;
  entries: RepoTreeEntryResponse[];
}

export interface RepoFileResponse {
  path: string;
  sha: string;
  commitSha: string;
  size: number | null;
  /** Null when the file is binary or too large; `editable` says which. */
  content: string | null;
  /** False for binary files and files over the size cap. */
  editable: boolean;
  binary: boolean;
  /** True when a path matches the assignment's protectedPaths. */
  protected: boolean;
}

// --- Editor: write ---------------------------------------------------------

export interface CommitFileRequest {
  path: string;
  content: string;
  encoding: 'utf-8' | 'base64';
}

export interface CreateCommitRequest {
  /** The commit the editor loaded from. A mismatch is a 409, never an overwrite. */
  baseCommitSha: string;
  message?: string;
  files: CommitFileRequest[];
  deletedPaths?: string[];
}

export interface CreateCommitResponse {
  commitSha: string;
  treeSha: string;
  /** False when the save was a no-op, i.e. nothing actually changed. */
  changed: boolean;
}

/** Body of the 409 a save gets when the branch moved underneath it. */
export interface CommitConflictResponse {
  currentCommitSha: string;
  baseCommitSha: string;
  changedPaths: string[];
}

export interface SaveDraftRequest {
  path: string;
  content: string;
}

export interface DraftResponse {
  path: string;
  content: string;
  savedAt: string;
}

// --- Runs: dispatch --------------------------------------------------------

export interface CreateRunRequest {
  /** The exact commit to grade. Run never means "latest". */
  commitSha: string;
}

// --- Admin -----------------------------------------------------------------

export interface AdminSubmissionResponse extends SubmissionResponse {
  userId: string;
  userName: string | null;
  repoFullName: string | null;
  isSubmitted: boolean;
  isPassing: boolean;
}

export interface UpdateSubmissionScoreRequest {
  isSubmitted?: boolean;
  isPassing?: boolean;
}

export interface SyncAssignmentsResponse {
  created: number;
  updated: number;
}

export interface RegradeResponse {
  dispatched: number;
  skipped: number;
}

export interface ArchiveAssignmentResponse {
  archived: number;
  failed: number;
}
