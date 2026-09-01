import assignmentService from '../services/assignmentService.ts';
import { createUseMutation, createUseQuery } from '../http';
import type {
  AssignmentDetailResponse,
  AssignmentSummaryResponse,
  CIRunDetailResponse,
  CIRunLogResponse,
  CIRunSummaryResponse,
  CreateCommitRequest,
  CreateCommitResponse,
  DraftResponse,
  RepoFileResponse,
  RepoTreeResponse,
  SubmissionResponse,
} from '@nonce/shared';

// ===============
// Queries
// ===============

export const useMyAssignments = createUseQuery<
  AssignmentSummaryResponse[],
  void
>(
  () => ['assignments', 'me'],
  () => assignmentService.listMyAssignments
);

export const useAssignment = createUseQuery<AssignmentDetailResponse, string>(
  assignmentId => ['assignment', assignmentId],
  assignmentId => () => assignmentService.getAssignment(assignmentId)
);

export const useSubmissionTree = createUseQuery<
  RepoTreeResponse,
  { submissionId: string; ref?: string }
>(
  ({ submissionId, ref }) => ['submission', submissionId, 'tree', ref ?? ''],
  ({ submissionId, ref }) =>
    () =>
      assignmentService.getTree(submissionId, ref)
);

// Files are content-addressed once a ref resolves to a commit, so the caller
// keys on the commit SHA and the result never needs revalidating.
export const useSubmissionFile = createUseQuery<
  RepoFileResponse,
  { submissionId: string; path: string; ref?: string }
>(
  ({ submissionId, path, ref }) => [
    'submission',
    submissionId,
    'file',
    path,
    ref ?? '',
  ],
  ({ submissionId, path, ref }) =>
    () =>
      assignmentService.getFile(submissionId, path, ref)
);

export const useSubmissionRuns = createUseQuery<
  CIRunSummaryResponse[],
  string
>(
  submissionId => ['submission', submissionId, 'runs'],
  submissionId => () => assignmentService.listRuns(submissionId)
);

export const useRun = createUseQuery<CIRunDetailResponse, string>(
  runId => ['run', runId],
  runId => () => assignmentService.getRun(runId)
);

export const useRunLogs = createUseQuery<CIRunLogResponse, string>(
  runId => ['run', runId, 'logs'],
  runId => () => assignmentService.getRunLogs(runId)
);

export const useDraft = createUseQuery<
  DraftResponse | null,
  { submissionId: string; path: string }
>(
  ({ submissionId, path }) => ['submission', submissionId, 'draft', path],
  ({ submissionId, path }) =>
    () =>
      assignmentService.getDraft(submissionId, path)
);

// ===============
// Mutations
// ===============

export const useAcceptAssignment = createUseMutation<
  SubmissionResponse,
  string
>(assignmentId => assignmentService.acceptAssignment(assignmentId), {
  queryInvalidation: async ({ variables: assignmentId }) => {
    await useAssignment.invalidate(assignmentId);
    await useMyAssignments.invalidate();
  },
});

export const useCommit = createUseMutation<
  CreateCommitResponse,
  { submissionId: string; body: CreateCommitRequest }
>(({ submissionId, body }) => assignmentService.commit(submissionId, body), {
  queryInvalidation: async ({ variables: { submissionId } }) => {
    // The tree moved, so its cached entries are stale. Individual files are
    // keyed by commit SHA and stay valid.
    await useSubmissionTree.invalidate({ submissionId });
  },
});

// Paired with `debouncedMutate` from the mutation factory, this is the editor's
// autosave. Drafts live in Redis for 24h and are a crash-safety net only — the
// commit is the artifact.
export const useSaveDraft = createUseMutation<
  DraftResponse,
  { submissionId: string; path: string; content: string }
>(({ submissionId, path, content }) =>
  assignmentService.saveDraft(submissionId, path, content)
);

export const useCreateRun = createUseMutation<
  CIRunDetailResponse,
  { submissionId: string; commitSha: string }
>(
  ({ submissionId, commitSha }) =>
    assignmentService.createRun(submissionId, commitSha),
  {
    queryInvalidation: async ({ variables: { submissionId } }) => {
      await useSubmissionRuns.invalidate(submissionId);
    },
  }
);
