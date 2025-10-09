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
  hasGoodDocumentation: boolean;
  hasGoodStructure: boolean;
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
}

export const WeeklyBreakdownCard = ({ week }: WeeklyBreakdownCardProps) => {
  const gd = week.groupDiscussionScores;
  const ex = week.exerciseScores;

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
          <span className={`px-2 py-1 text-xs ${gd.attendance ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
            {gd.attendance ? 'Present' : 'Absent'}
          </span>
        </div>
        <div className="text-orange-300 font-bold">
          {week.totalScore} / {week.maxTotalScore}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Group Discussion Scores */}
        <div>
          <h4 className="text-orange-400 font-semibold mb-3 border-b border-orange-400 pb-2">
            Group Discussion ({gd.totalScore}/{gd.maxTotalScore})
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

        {/* Exercise Scores */}
        <div>
          <h4 className="text-orange-400 font-semibold mb-3 border-b border-orange-400 pb-2">
            Exercise ({ex.totalScore}/{ex.maxTotalScore})
          </h4>
          <div className="space-y-2 text-sm">
            <BooleanRow label="Submitted" value={ex.isSubmitted} />
            <BooleanRow label="Tests Passing" value={ex.isPassing} />
            <BooleanRow label="Good Documentation" value={ex.hasGoodDocumentation} />
            <BooleanRow label="Good Structure" value={ex.hasGoodStructure} />
          </div>
        </div>
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
          style={{ width: `${(score / max) * 100}%` }}
        />
      </div>
      <span className="text-orange-300 font-semibold w-12 text-right">{score}/{max}</span>
    </div>
  </div>
);

const BooleanRow = ({ label, value }: { label: string; value: boolean }) => (
  <div className="flex justify-between items-center text-orange-200">
    <span>{label}</span>
    <span className={`px-3 py-1 text-xs font-semibold ${value ? 'bg-green-700 text-white' : 'bg-zinc-700 text-orange-300'}`}>
      {value ? '✓ Yes' : '✗ No'}
    </span>
  </div>
);
