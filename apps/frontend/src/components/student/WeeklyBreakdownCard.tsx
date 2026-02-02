import { cohortHasExercises, SCORES_WITH_EXERCISES, SCORES_WITHOUT_EXERCISES_SCALED } from '../../utils/calculations';

interface GroupDiscussionScores {
  attendance: boolean;
  communicationScore: number;
  maxCommunicationScore: number;
  depthOfAnswerScore: number;
  maxDepthOfAnswerScore: number;
  technicalBitcoinFluencyScore: number;
  maxTechnicalBitcoinFluencyScore: number;
  engagementScore: number;
  maxEngagementScore: number;
  bonusAnswerScore: number;
  maxBonusAnswerScore: number;
  bonusFollowupScore: number;
  maxBonusFollowupScore: number;
  totalScore: number;
  maxTotalScore: number;
  groupNumber: number | null;
}

interface ExerciseScores {
  isSubmitted: boolean;
  isPassing: boolean;
  totalScore: number;
  maxTotalScore: number;
}

interface WeekData {
  week: number;
  weekId: string;
  totalScore: number;
  maxTotalScore: number;
  groupDiscussionScores: GroupDiscussionScores;
  exerciseScores: ExerciseScores;
  attendance: boolean;
}

interface WeeklyBreakdownCardProps {
  week: WeekData;
  studentName: string;
  cohortType?: string;
}

export const WeeklyBreakdownCard = ({ week, cohortType }: WeeklyBreakdownCardProps) => {
  const gd = week.groupDiscussionScores;
  const ex = week.exerciseScores || { isSubmitted: false, isPassing: false, totalScore: 0, maxTotalScore: 60 };
  const hasExercises = cohortHasExercises(cohortType || '');

  // Get max scores based on cohort type
  const maxScores = hasExercises ? SCORES_WITH_EXERCISES : SCORES_WITHOUT_EXERCISES_SCALED;

  return (
    <div className="bg-zinc-900 border border-orange-300 font-mono rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-zinc-700 px-4 py-3 flex items-center justify-between border-b border-orange-300">
        <div className="flex items-center space-x-3">
          <span className="text-orange-300 font-semibold">Week {week.week}</span>
          {gd.groupNumber !== null && (
            <span className="px-2 py-1 text-xs bg-orange-500 text-white">
              Group {gd.groupNumber}
            </span>
          )}
          <span className={`px-2 py-1 text-xs ${week.attendance ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
            {week.attendance ? 'Present' : 'Absent'}
          </span>
        </div>
        <div className="text-orange-300 font-bold">
          {week.totalScore} / {maxScores.total}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Group Discussion Scores */}
        <div>
          <h4 className="text-orange-400 font-semibold mb-3 border-b border-orange-400 pb-2">
            Group Discussion ({gd.totalScore}/{maxScores.gd})
          </h4>
          <div className="space-y-2 text-sm">
            <ScoreRow label="Communication" score={gd.communicationScore} max={gd.maxCommunicationScore} />
            <ScoreRow label="Depth of Answer" score={gd.depthOfAnswerScore} max={gd.maxDepthOfAnswerScore} />
            <ScoreRow label="Technical Fluency" score={gd.technicalBitcoinFluencyScore} max={gd.maxTechnicalBitcoinFluencyScore} />
            <ScoreRow label="Engagement" score={gd.engagementScore} max={gd.maxEngagementScore} />
            <ScoreRow label="Bonus Answer" score={gd.bonusAnswerScore} max={gd.maxBonusAnswerScore} />
            <ScoreRow label="Bonus Followup" score={gd.bonusFollowupScore} max={gd.maxBonusFollowupScore} />
          </div>
        </div>

        {/* Exercise Scores - Only show for cohorts with exercises */}
        {hasExercises && (
          <div>
            <h4 className="text-orange-400 font-semibold mb-3 border-b border-orange-400 pb-2">
              Exercise ({ex.totalScore}/{maxScores.exercise})
            </h4>
            <div className="space-y-2 text-sm">
              <BooleanRow label="Submitted" value={ex.isSubmitted} points={10} />
              <BooleanRow label="Tests Passing" value={ex.isPassing} points={50} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ScoreRow = ({ label, score, max }: { label: string; score: number; max: number }) => (
  <div className="flex justify-between items-center text-orange-200">
    <span>{label}</span>
    <div className="flex items-center space-x-2">
      <div className="w-24 bg-zinc-700 h-2 border border-orange-400">
        <div
          className="bg-orange-400 h-2"
          style={{ width: max > 0 ? `${(score / max) * 100}%` : '0%' }}
        />
      </div>
      <span className="text-orange-300 font-semibold w-12 text-right">{score}/{max}</span>
    </div>
  </div>
);

const BooleanRow = ({ label, value, points }: { label: string; value: boolean; points: number }) => (
  <div className="flex justify-between items-center text-orange-200">
    <span>{label}</span>
    <div className="flex items-center space-x-2">
      <span className={`px-3 py-1 text-xs font-semibold ${value ? 'bg-green-700 text-white' : 'bg-zinc-700 text-orange-300'}`}>
        {value ? `+${points} pts` : '0 pts'}
      </span>
    </div>
  </div>
);
