import type { GdScore, BonusScore, ExerciseScore } from '../types/student';

/**
 * Scoring System Policy (matching backend):
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * COHORTS WITH EXERCISES (100 pts max per week)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 1. Attendance Score: 10 pts (flat)
 *
 * 2. Group Discussion Score (30 pts max, scaled from 150 raw)
 *
 *    Raw GD Traits (100 pts max):
 *    ┌───────────────────────────┬────────────────┐
 *    │           Trait           │ Max Raw Points │
 *    ├───────────────────────────┼────────────────┤
 *    │ Communication             │ 30             │
 *    │ Depth of Answer           │ 30             │
 *    │ Technical Bitcoin Fluency │ 20             │
 *    │ Engagement                │ 20             │
 *    └───────────────────────────┴────────────────┘
 *    Each trait: traitScore = MAX_POINTS × (grade / 5)
 *
 *    Bonus Round (50 pts max):
 *    ┌────────────────────┬────────────────────────┐
 *    │     Component      │         Points         │
 *    ├────────────────────┼────────────────────────┤
 *    │ Attempted bonus    │ 10 (flat)              │
 *    │ Answer quality     │ 30 (scaled by grade/5) │
 *    │ Follow-up response │ 10 (scaled by grade/5) │
 *    └────────────────────┴────────────────────────┘
 *
 *    Total raw GD = Traits (100) + Bonus (50) = 150 max
 *    Scaled GD = (rawTotal / 150) × 30
 *
 * 3. Exercise Score (60 pts max):
 *    ┌───────────────┬────────────┐
 *    │   Criterion   │    Points  │
 *    ├───────────────┼────────────┤
 *    │ Submitted     │ 10         │
 *    │ Tests Passing │ 50         │
 *    └───────────────┴────────────┘
 *
 * Weekly Total = 10 + 30 + 60 = 100 max
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * COHORTS WITHOUT EXERCISES (e.g., Mastering Bitcoin) - Scaled to 100 pts
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Backend gives: Attendance (10) + GD (30) = 40 max
 * Frontend scales to 100: (score / 40) × 100
 *
 * Effective scaling:
 *    Attendance: 25 pts (10/40 × 100)
 *    GD: 75 pts (30/40 × 100)
 *    Total: 100 max
 */

// === Constants ===

// Raw GD trait weights (out of 5 input, scaled to these max values)
export const GD_TRAIT_WEIGHTS = {
  communication: 30,        // fa
  depthOfAnswer: 30,        // fb
  technicalFluency: 20,     // fc
  engagement: 20,           // fd
} as const;

export const GD_TRAITS_RAW_MAX = 100; // Sum of all trait weights

// Bonus weights
export const BONUS_WEIGHTS = {
  attempted: 10,            // flat if attempted
  answerQuality: 30,        // scaled by grade/5
  followUp: 10,             // scaled by grade/5
} as const;

export const BONUS_RAW_MAX = 50;
export const GD_TOTAL_RAW_MAX = 150; // GD traits + Bonus

// Exercise weights
export const EXERCISE_WEIGHTS = {
  submitted: 10,
  testsPassing: 50,
} as const;

export const EXERCISE_RAW_MAX = 60;

// Scaled maximums for cohorts WITH exercises
export const SCORES_WITH_EXERCISES = {
  attendance: 10,
  gd: 30,
  exercise: 60,
  total: 100,
} as const;

// For cohorts WITHOUT exercises, backend gives 40 max, we scale to 100
export const SCORES_WITHOUT_EXERCISES_RAW = {
  attendance: 10,
  gd: 30,
  exercise: 0,
  total: 40,
} as const;

// Scaled to 100 for display
export const SCORES_WITHOUT_EXERCISES_SCALED = {
  attendance: 25,  // (10/40) × 100
  gd: 75,          // (30/40) × 100
  exercise: 0,
  total: 100,
} as const;

// === Helper Functions ===

/**
 * Check if a cohort type has exercises
 */
export const cohortHasExercises = (cohortType: string): boolean => {
  return cohortType !== 'MASTERING_BITCOIN';
};

/**
 * Get max scores based on whether cohort has exercises
 * @param hasExercises - whether cohort has exercises
 * @param scaled - if true, returns scaled values for no-exercise cohorts (default true)
 */
export const getMaxScores = (hasExercises: boolean = true, scaled: boolean = true) => {
  if (hasExercises) {
    return { ...SCORES_WITH_EXERCISES };
  }
  return scaled ? { ...SCORES_WITHOUT_EXERCISES_SCALED } : { ...SCORES_WITHOUT_EXERCISES_RAW };
};

// === Score Computation Functions ===

/**
 * Compute attendance score
 */
export const computeAttendanceScore = (attended: boolean, hasExercises: boolean = true): number => {
  if (!attended) return 0;
  return hasExercises ? SCORES_WITH_EXERCISES.attendance : SCORES_WITHOUT_EXERCISES_RAW.attendance;
};

/**
 * Compute raw GD traits score (0-100)
 * Each trait is graded 0-5, then scaled by its weight
 */
export const computeGdTraitsRaw = (gdScore: GdScore): number => {
  const maxGrade = 5;
  return (
    GD_TRAIT_WEIGHTS.communication * (gdScore.fa / maxGrade) +
    GD_TRAIT_WEIGHTS.depthOfAnswer * (gdScore.fb / maxGrade) +
    GD_TRAIT_WEIGHTS.technicalFluency * (gdScore.fc / maxGrade) +
    GD_TRAIT_WEIGHTS.engagement * (gdScore.fd / maxGrade)
  );
};

/**
 * Compute raw bonus score (0-50)
 */
export const computeBonusRaw = (bonusScore: BonusScore): number => {
  const maxGrade = 5;
  return (
    (bonusScore.attempt > 0 ? BONUS_WEIGHTS.attempted : 0) +
    BONUS_WEIGHTS.answerQuality * (bonusScore.good / maxGrade) +
    BONUS_WEIGHTS.followUp * (bonusScore.followUp / maxGrade)
  );
};

/**
 * Compute total raw GD score (0-150) including bonus
 */
export const computeGdTotalRaw = (gdScore: GdScore, bonusScore?: BonusScore): number => {
  const traitsRaw = computeGdTraitsRaw(gdScore);
  const bonusRaw = bonusScore ? computeBonusRaw(bonusScore) : 0;
  return traitsRaw + bonusRaw;
};

/**
 * Compute scaled GD score (0-30)
 * Scaled GD = (rawTotal / 150) × 30
 */
export const computeGdTotal = (gdScore: GdScore, bonusScore?: BonusScore): number => {
  const rawTotal = computeGdTotalRaw(gdScore, bonusScore);
  return (rawTotal / GD_TOTAL_RAW_MAX) * SCORES_WITH_EXERCISES.gd;
};

/**
 * Compute exercise score (0-60)
 * This is 1:1 with raw scores (no scaling needed)
 */
export const computeExerciseTotal = (exerciseScore: ExerciseScore): number => {
  return (
    (exerciseScore.Submitted ? EXERCISE_WEIGHTS.submitted : 0) +
    (exerciseScore.privateTest ? EXERCISE_WEIGHTS.testsPassing : 0)
  );
};

/**
 * Legacy function for backward compatibility
 */
export const computeBonusTotal = (bonusScore: BonusScore): number => {
  return computeBonusRaw(bonusScore);
};

/**
 * Compute total weekly score
 * @param scores - all score components
 * @param hasExercises - whether cohort has exercises
 * @param scaled - if true, scales no-exercise cohorts to 100 (default true)
 */
export const computeTotal = (
  scores: {
    attendance: boolean;
    gdScore: GdScore;
    bonusScore: BonusScore;
    exerciseScore: ExerciseScore;
  },
  hasExercises: boolean = true,
  scaled: boolean = true
): number => {
  const attendance = computeAttendanceScore(scores.attendance, hasExercises);
  const gd = computeGdTotal(scores.gdScore, scores.bonusScore);
  const exercise = hasExercises ? computeExerciseTotal(scores.exerciseScore) : 0;

  const rawTotal = attendance + gd + exercise;

  // For cohorts without exercises, scale from 40 to 100 if requested
  if (!hasExercises && scaled) {
    return (rawTotal / SCORES_WITHOUT_EXERCISES_RAW.total) * SCORES_WITHOUT_EXERCISES_SCALED.total;
  }

  return rawTotal;
};

/**
 * Scale a score from no-exercise cohort (40 max) to 100
 */
export const scaleNoExerciseScore = (score: number): number => {
  return (score / SCORES_WITHOUT_EXERCISES_RAW.total) * SCORES_WITHOUT_EXERCISES_SCALED.total;
};

// === Utility Functions ===

export const calculatePercentage = (score: number, maxScore: number): number => {
  return maxScore > 0 ? (score / maxScore) * 100 : 0;
};

export const getScoreColor = (score: number, maxScore: number): string => {
  const percentage = calculatePercentage(score, maxScore);

  if (percentage >= 80) return 'text-green-400';
  if (percentage >= 60) return 'text-yellow-400';
  if (percentage >= 40) return 'text-orange-400';
  return 'text-red-400';
};

export const calculateStudentStats = (
  weeklyData: Array<{
    week: number;
    attendance: boolean;
    total: number;
  }>,
  hasExercises: boolean = true
): {
  attendedWeeks: number;
  totalScore: number;
  avgScore: number;
  attendanceRate: number;
  maxPossibleScore: number;
  overallPercentage: number;
  totalWeeks: number;
} => {
  const validWeeks = weeklyData.filter(w => w.week > 0);
  const attendedWeeks = validWeeks.filter(w => w.attendance).length;
  const totalScore = validWeeks.reduce((sum, w) => sum + w.total, 0);
  const maxScores = getMaxScores(hasExercises);
  const maxPossibleScore = validWeeks.length * maxScores.total;
  const avgScore = validWeeks.length > 0 ? totalScore / validWeeks.length : 0;
  const attendanceRate = validWeeks.length > 0 ? (attendedWeeks / validWeeks.length) * 100 : 0;
  const overallPercentage = calculatePercentage(totalScore, maxPossibleScore);

  return {
    attendedWeeks,
    totalScore,
    avgScore,
    attendanceRate,
    maxPossibleScore,
    overallPercentage,
    totalWeeks: validWeeks.length,
  };
};

// === Validation Functions ===

export const isValidGdScore = (gdScore: GdScore): boolean => {
  const { fa, fb, fc, fd } = gdScore;
  return [fa, fb, fc, fd].every(
    score => Number.isInteger(score) && score >= 0 && score <= 5
  );
};

export const isValidBonusScore = (bonusScore: BonusScore): boolean => {
  const { attempt, good, followUp } = bonusScore;
  return [attempt, good, followUp].every(
    score => Number.isInteger(score) && score >= 0 && score <= 5
  );
};

export const isValidExerciseScore = (exerciseScore: ExerciseScore): boolean => {
  const { Submitted, privateTest } = exerciseScore;
  return [Submitted, privateTest].every(value => typeof value === 'boolean');
};
