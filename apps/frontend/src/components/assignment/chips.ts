import { AssignmentStatus, ProvisionStatus } from '@nonce/shared';

export type ChipColor = 'default' | 'success' | 'error' | 'info' | 'warning';

interface ChipStyle {
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
