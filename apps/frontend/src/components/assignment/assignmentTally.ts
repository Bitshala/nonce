import type { AdminAssignmentResponse } from '@nonce/shared';
import { BUCKET_META, chipPaletteColor, type BucketKey } from './chips';

export type Tally = Pick<
  AdminAssignmentResponse,
  | 'passedCount'
  | 'failingCount'
  | 'inProgressCount'
  | 'failedProvisionCount'
  | 'notStartedCount'
>;

/** Which tally field counts each bucket. */
export const BUCKET_COUNT_KEY: Record<BucketKey, keyof Tally> = {
  passed: 'passedCount',
  failing: 'failingCount',
  setupFailed: 'failedProvisionCount',
  inProgress: 'inProgressCount',
  notStarted: 'notStartedCount',
};

const SEGMENT_ORDER: BucketKey[] = [
  'passed',
  'failing',
  'setupFailed',
  'inProgress',
  'notStarted',
];

export const SEGMENTS = SEGMENT_ORDER.map(bucket => ({
  key: BUCKET_COUNT_KEY[bucket],
  label: BUCKET_META[bucket].label,
  color: chipPaletteColor(BUCKET_META[bucket].color),
}));

export const sumTallies = (rows: Tally[]): Tally => ({
  passedCount: rows.reduce((n, r) => n + r.passedCount, 0),
  failingCount: rows.reduce((n, r) => n + r.failingCount, 0),
  inProgressCount: rows.reduce((n, r) => n + r.inProgressCount, 0),
  failedProvisionCount: rows.reduce((n, r) => n + r.failedProvisionCount, 0),
  notStartedCount: rows.reduce((n, r) => n + r.notStartedCount, 0),
});
