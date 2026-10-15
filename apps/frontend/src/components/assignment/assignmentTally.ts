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

export const sumTallies = (rows: Tally[]): Tally => {
  const total = Object.fromEntries(
    SEGMENTS.map(({ key }) => [key, 0])
  ) as Tally;
  for (const row of rows) {
    for (const { key } of SEGMENTS) total[key] += row[key];
  }
  return total;
};
