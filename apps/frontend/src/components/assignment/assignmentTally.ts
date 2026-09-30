import type { AdminAssignmentResponse } from '@nonce/shared';

export type Tally = Pick<
  AdminAssignmentResponse,
  | 'passedCount'
  | 'failingCount'
  | 'inProgressCount'
  | 'failedProvisionCount'
  | 'notStartedCount'
>;

export const SEGMENTS: { key: keyof Tally; label: string; color: string }[] = [
  { key: 'passedCount', label: 'Passed', color: 'success.main' },
  { key: 'failingCount', label: 'Failing', color: 'error.main' },
  { key: 'failedProvisionCount', label: 'Setup failed', color: 'warning.main' },
  { key: 'inProgressCount', label: 'In progress', color: 'info.main' },
  { key: 'notStartedCount', label: 'Not started', color: 'action.disabled' },
];

export const sumTallies = (rows: Tally[]): Tally => ({
  passedCount: rows.reduce((n, r) => n + r.passedCount, 0),
  failingCount: rows.reduce((n, r) => n + r.failingCount, 0),
  inProgressCount: rows.reduce((n, r) => n + r.inProgressCount, 0),
  failedProvisionCount: rows.reduce((n, r) => n + r.failedProvisionCount, 0),
  notStartedCount: rows.reduce((n, r) => n + r.notStartedCount, 0),
});
