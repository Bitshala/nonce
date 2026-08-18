import { CohortType, lookupCohortFullName } from '@nonce/shared';
import { ServiceError } from '@/common/errors';

/**
 * The name table itself lives in @nonce/shared (see COHORT_FULL_NAMES) so the
 * frontend renders identical strings. This wrapper keeps the backend's strict
 * behaviour: server-side, an unrecognised cohort type means our own data is
 * wrong, so it raises a ServiceError rather than degrading to a placeholder.
 */
export function getCohortFullName(cohortType: CohortType): string {
    const name = lookupCohortFullName(cohortType);
    if (!name) {
        throw new ServiceError(
            `Unknown cohort type encountered: ${cohortType}`,
        );
    }
    return name;
}
