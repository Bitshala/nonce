import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

/** Once the repository exists there is nothing left to do but open the editor. */
export const useOpenEditorWhenReady = (
  assignmentId: string | undefined,
  status: ProvisionStatus | undefined
): void => {
  const navigate = useNavigate();
  const isReady = status === ProvisionStatus.READY;
  useEffect(() => {
    if (isReady && assignmentId) {
      navigate(`/assignments/${assignmentId}/editor`, { replace: true });
    }
  }, [isReady, assignmentId, navigate]);
};
