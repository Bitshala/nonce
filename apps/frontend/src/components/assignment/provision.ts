import { ProvisionStatus } from '@nonce/shared';

/** How often to re-check while a repository is being created. */
const PROVISION_POLL_MS = 2000;

/** True while the repository does not exist yet and a worker is still on it. */
export const isProvisioning = (status: ProvisionStatus | undefined): boolean =>
  status === ProvisionStatus.PENDING || status === ProvisionStatus.PROVISIONING;

/** react-query `refetchInterval` for a query whose data carries a submission. */
export const provisionRefetchInterval = (query: {
  state: {
    data?: { submission?: { provisionStatus: ProvisionStatus } | null };
  };
}): number | false =>
  isProvisioning(query.state.data?.submission?.provisionStatus)
    ? PROVISION_POLL_MS
    : false;
