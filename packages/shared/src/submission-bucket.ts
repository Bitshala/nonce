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
