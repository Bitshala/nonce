import type { ProvisionStatus } from './enums';

/** Where one submission sits in the admin tallies. Every submission is in exactly one. */
export type SubmissionBucket =
  'passed' | 'setupFailed' | 'failing' | 'inProgress';

/**
 * The single rule for bucketing a submission, so the API's counts and the
 * admin UI's per-student chips cannot drift apart.
 *
 * Passing mirrors what the score writeback records: a staff pin wins,
 * otherwise a scoring run must have passed. A failed setup is checked before
 * runs because such a submission cannot have any. "Failing" means it has run
 * and has not passed.
 */
export function submissionBucket(submission: {
  isPassingOverride: boolean | null;
  bestRun: unknown;
  latestRun: unknown;
  provisionStatus: ProvisionStatus;
}): SubmissionBucket {
  if (submission.isPassingOverride ?? submission.bestRun != null) {
    return 'passed';
  }
  if (submission.provisionStatus === 'FAILED') return 'setupFailed';
  return submission.latestRun != null ? 'failing' : 'inProgress';
}

/**
 * Whether re-grading could still change a submission's score: its repo
 * exists, it has work beyond the template to grade, grading rather than a
 * staff pin decides it, and it has not passed. A pass is never replaced and a
 * pin outranks grading, so re-running either would only spend Actions
 * minutes. The admin re-grade and the count on its button both use this.
 */
export function isRegradeCandidate(submission: {
  provisionStatus: ProvisionStatus;
  hasStudentCommits: boolean;
  bestRun: unknown;
  isPassingOverride: boolean | null;
}): boolean {
  return (
    submission.provisionStatus === 'READY' &&
    submission.hasStudentCommits &&
    submission.bestRun == null &&
    submission.isPassingOverride === null
  );
}
