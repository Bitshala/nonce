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

/**
 * Once the repository exists there is nothing left to do but open the editor.
 *
 * `replace` is for the brief page, which redirects even when the repository
 * already existed: Back must skip it, or it would redirect straight back. The
 * drawer opens over the list only while setting up, so it pushes, and Back
 * returns to the list.
 */
export const useOpenEditorWhenReady = (
  assignmentId: string | undefined,
  status: ProvisionStatus | undefined,
  { replace }: { replace: boolean }
): void => {
  const navigate = useNavigate();
  const isReady = status === ProvisionStatus.READY;
  useEffect(() => {
    if (isReady && assignmentId) {
      navigate(`/assignments/${assignmentId}/editor`, { replace });
    }
  }, [isReady, assignmentId, navigate, replace]);
};

/** react-query `refetchInterval` for the list, while any of it is setting up. */
export const listProvisionRefetchInterval = (query: {
  state: {
    data?: { submission?: { provisionStatus: ProvisionStatus } | null }[];
  };
}): number | false =>
  query.state.data?.some(item =>
    isProvisioning(item.submission?.provisionStatus)
  )
    ? PROVISION_POLL_MS
    : false;
