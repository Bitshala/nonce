import {
  AssignmentStatus,
  ProvisionStatus,
  type SubmissionBucket,
} from '@nonce/shared';

export type ChipColor = 'default' | 'success' | 'error' | 'info' | 'warning';

export interface ChipStyle {
  label: string;
  color: ChipColor;
}

export const ASSIGNMENT_STATUS_CHIP: Record<AssignmentStatus, ChipStyle> = {
  [AssignmentStatus.DRAFT]: { label: 'Draft', color: 'default' },
  [AssignmentStatus.PUBLISHED]: { label: 'Published', color: 'success' },
  [AssignmentStatus.CLOSED]: { label: 'Closed', color: 'warning' },
};

export const PROVISION_CHIP: Record<ProvisionStatus, ChipStyle> = {
  [ProvisionStatus.PENDING]: { label: 'Pending', color: 'info' },
  [ProvisionStatus.PROVISIONING]: { label: 'Setting up', color: 'info' },
  [ProvisionStatus.READY]: { label: 'Ready', color: 'success' },
  [ProvisionStatus.FAILED]: { label: 'Setup failed', color: 'warning' },
};

/** A submission's bucket, or `notStarted` for an enrolled student without one. */
export type BucketKey = SubmissionBucket | 'notStarted';

/** The one label and colour per bucket, for chips, bars, legends and filters. */
export const BUCKET_META: Record<BucketKey, ChipStyle> = {
  passed: { label: 'Passed', color: 'success' },
  failing: { label: 'Failing', color: 'error' },
  setupFailed: { label: 'Setup failed', color: 'warning' },
  inProgress: { label: 'In progress', color: 'info' },
  notStarted: { label: 'Not started', color: 'default' },
};

/** Theme palette path for a chip colour, for dots and bars that aren't chips. */
export const chipPaletteColor = (color: ChipColor): string =>
  color === 'default' ? 'action.disabled' : `${color}.main`;
