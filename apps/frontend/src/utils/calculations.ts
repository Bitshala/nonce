import type { GdScore, BonusScore, ExerciseScore } from '../types/student';

export const computeGdTotal = (gdScore: GdScore): number => {
  return (
    (30 / 5) * gdScore.fa +
    (30 / 5) * gdScore.fb +
    (20 / 5) * gdScore.fc +
    (20 / 5) * gdScore.fd
  );
};

export const computeBonusTotal = (bonusScore: BonusScore): number => {
  return (
    10 * bonusScore.attempt + 10 * bonusScore.good + 10 * bonusScore.followUp
  );
};

export const computeExerciseTotal = (exerciseScore: ExerciseScore): number => {
  return (
    (exerciseScore.Submitted ? 10 : 0) +
    (exerciseScore.privateTest ? 50 : 0) +
    (exerciseScore.goodDoc ? 20 : 0) +
    (exerciseScore.goodStructure ? 20 : 0)
  );
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
  gd: 100,
  bonus: 30,
  exercise: 100,
  total: 310,
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
  const { Submitted, privateTest, goodDoc, goodStructure } = exerciseScore;
  return [Submitted, privateTest, goodDoc, goodStructure].every(
    value => typeof value === 'boolean'
  );
};
