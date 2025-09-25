import type { GdScore, BonusScore, ExerciseScore } from '../types/student';

export const computeGdTotal = (gdScore: GdScore): number => {
  // Backend calculation approximation to match maxTotalScore: 150
  // If all GD scores are 5, should total ~120, leaving 30 for bonus
  return (
    6 * gdScore.fa +     // Communication: 6 × 5 = 30 max
    6 * gdScore.fb +     // Depth of Answer: 6 × 5 = 30 max
    6 * gdScore.fc +     // Technical Fluency: 6 × 5 = 30 max
    6 * gdScore.fd       // Engagement: 6 × 5 = 30 max
  );
  // Total GD: 4 × 30 = 120 points max
};

export const computeBonusTotal = (bonusScore: BonusScore): number => {
  // Bonus fills remaining 30 points of the 150 max
  // Attempt is binary (0 or 1), good and followUp are 0-5
  // Distribute 30 points: 5 for attempt + 12.5 each for good/followUp
  return (
    5 * bonusScore.attempt +     // Bonus attempt: 5 × 1 = 5 max
    2.5 * bonusScore.good +      // bonusAnswerScore: 2.5 × 5 = 12.5 max
    2.5 * bonusScore.followUp    // bonusFollowupScore: 2.5 × 5 = 12.5 max
  );
  // Total bonus: 5 + 12.5 + 12.5 = 30 points max
  // Combined GD + Bonus: 120 + 30 = 150 points max ✓
};

export const computeExerciseTotal = (exerciseScore: ExerciseScore): number => {
  return (
    (exerciseScore.Submitted ? 10 : 0) +
    (exerciseScore.privateTest ? 90 : 0)
  );
  // Total: 10 + 90 = 100 points max (matches backend maxTotalScore)
};

export const computeTotal = (scores: {
  gdScore: GdScore;
  bonusScore: BonusScore;
  exerciseScore: ExerciseScore;
}): number => {
  return (
    computeGdTotal(scores.gdScore) +
    computeBonusTotal(scores.bonusScore) +
    computeExerciseTotal(scores.exerciseScore)
  );
};

export const getMaxScores = () => ({
  gd: 150,        // Backend maxTotalScore for groupDiscussionScores
  bonus: 0,       // Bonus is included in GD total, not separate
  exercise: 100,  // Backend maxTotalScore for exerciseScores
  total: 250,     // Backend overall maxTotalScore
});

export const calculatePercentage = (
  score: number,
  maxScore: number
): number => {
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
  }>
): {
  attendedWeeks: number;
  totalScore: number;
  avgScore: number;
  attendanceRate: number;
  maxPossibleScore: number;
  overallPercentage: number;
} => {
  // Filter out week 0 (usually setup/baseline week)
  const validWeeks = weeklyData.filter(w => w.week > 0);
  const attendedWeeks = validWeeks.filter(w => w.attendance).length;
  const totalScore = validWeeks.reduce((sum, w) => sum + w.total, 0);
  const avgScore = attendedWeeks > 0 ? totalScore / attendedWeeks : 0;
  const maxPossibleScore = attendedWeeks * getMaxScores().total;
  const attendanceRate =
    validWeeks.length > 0 ? (attendedWeeks / validWeeks.length) * 100 : 0;
  const overallPercentage = calculatePercentage(totalScore, maxPossibleScore);

  return {
    attendedWeeks,
    totalScore,
    avgScore,
    attendanceRate,
    maxPossibleScore,
    overallPercentage,
  };
};

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
  return [Submitted, privateTest].every(
    value => typeof value === 'boolean'
  );
};
