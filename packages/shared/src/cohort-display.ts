import { CohortType } from './enums';

/**
 * Human-readable, full display names per cohort type. Single source of truth,
 * consumed by the backend's mail templates and cohorts API response and by the
 * frontend's cohort tables and instruction sheets. Names are not derivable from
 * the enum value — they contain articles and casing a slug transform loses — so
 * they are mapped here.
 *
 * Typing this as Record<CohortType, string> is deliberate: adding a CohortType
 * without adding its display name is a compile error rather than a runtime
 * surprise.
 *
 * These two tables previously existed twice, and had drifted: the backend said
 * "Mastering the Lightning Network" while the frontend said "Mastering Lightning
 * Network". The backend spelling is authoritative and is what survives here.
 */
export const COHORT_FULL_NAMES: Readonly<Record<CohortType, string>> = {
  [CohortType.MASTERING_BITCOIN]: 'Mastering Bitcoin',
  [CohortType.LEARNING_BITCOIN_FROM_COMMAND_LINE]:
    'Learning Bitcoin from the Command Line',
  [CohortType.PROGRAMMING_BITCOIN]: 'Programming Bitcoin',
  [CohortType.BITCOIN_PROTOCOL_DEVELOPMENT]: 'Bitcoin Protocol Development',
  [CohortType.MASTERING_LIGHTNING_NETWORK]: 'Mastering the Lightning Network',
  [CohortType.BUILDING_BITCOIN_IN_RUST]: 'Building Bitcoin in Rust',
};

/** Short codes used in dense UI (table headers, chips, tabs). */
export const COHORT_SHORT_NAMES: Readonly<Record<CohortType, string>> = {
  [CohortType.MASTERING_BITCOIN]: 'MB',
  [CohortType.LEARNING_BITCOIN_FROM_COMMAND_LINE]: 'LBTCL',
  [CohortType.PROGRAMMING_BITCOIN]: 'PB',
  [CohortType.BITCOIN_PROTOCOL_DEVELOPMENT]: 'BPD',
  [CohortType.MASTERING_LIGHTNING_NETWORK]: 'MLN',
  [CohortType.BUILDING_BITCOIN_IN_RUST]: 'BBR',
};

/**
 * Lenient lookups. They return undefined rather than throwing or substituting a
 * placeholder, because the two apps want different things on a miss: the backend
 * raises a ServiceError (an unknown type there means our own data is wrong),
 * while the frontend degrades to a readable placeholder (a deployed bundle can
 * legitimately be older than the API). Each app wraps these with its own
 * behaviour; only the tables are shared.
 */
export function lookupCohortFullName(cohortType: string): string | undefined {
  return COHORT_FULL_NAMES[cohortType as CohortType];
}

export function lookupCohortShortName(cohortType: string): string | undefined {
  return COHORT_SHORT_NAMES[cohortType as CohortType];
}

/**
 * Initials fallback for an unrecognised cohort type, e.g.
 * "SOME_NEW_COHORT" -> "SNC". Used by the frontend so a cohort type newer than
 * the bundle still renders something sensible in dense UI.
 */
export function cohortInitials(cohortType: string): string {
  return cohortType
    .split('_')
    .map(word => word[0] ?? '')
    .join('');
}
