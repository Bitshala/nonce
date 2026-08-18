// Scoring maxima. These are the single source of truth for both the backend's
// score computation and the frontend's score rendering — the frontend used to
// keep its own copy in utils/calculations.ts, annotated "matching backend",
// which is exactly the kind of hand-synced duplication this package exists to
// remove.
//
// Backend-only constants (Discord invite URLs and similar) deliberately stay in
// apps/backend/src/common/constants.ts; nothing here should be app-specific.

/** Raw group-discussion trait weights. Each trait scores MAX * (grade / 5). */
export const GD_MAX = {
  communication: 30,
  depth: 30,
  technical: 20,
  engagement: 20,
} as const;

/** Bonus round: a flat attempt score plus two graded components. */
export const BONUS_MAX = {
  attempt: 10,
  answer: 30,
  followup: 10,
} as const;

export const EXERCISE_MAX = {
  submission: 10,
  tests: 50,
} as const;

/** Weekly totals each section is scaled into: 10 + 30 + 60 = 100. */
export const SCALING_FACTOR = {
  ATTENDANCE: 10,
  GD: 30,
  EXERCISE: 60,
} as const;

/** Sum of the GD trait weights before scaling (100). */
export const GD_TRAITS_RAW_MAX =
  GD_MAX.communication + GD_MAX.depth + GD_MAX.technical + GD_MAX.engagement;

/** Sum of the bonus components before scaling (50). */
export const BONUS_RAW_MAX =
  BONUS_MAX.attempt + BONUS_MAX.answer + BONUS_MAX.followup;

/** Total raw group-discussion score before scaling into SCALING_FACTOR.GD (150). */
export const GD_RAW_MAX = GD_TRAITS_RAW_MAX + BONUS_RAW_MAX;
