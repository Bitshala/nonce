import { ExternalLink, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { computeGdTotal, computeBonusTotal, computeExerciseTotal, computeTotal } from '../../utils/calculations';
import { fetchStudentRepoLink } from '../../services/studentService';
import type { WeeklyData } from '../../types/student';

interface WeeklyBreakdownCardProps {
  week: WeeklyData;
  studentName: string;
}

const groupInvite: Record<number, string> = {
  1: "https://discord.gg/KGbaDB5r",
  2: "https://discord.gg/tMFCMxKB",
  3: "https://discord.gg/vCyCvcqv",
  4: "https://discord.gg/mYeXh2N5"
};


const cohort_name = localStorage.getItem('selected_cohort_db_path') || 'lbtcl_cohort.db';
export const WeeklyBreakdownCard = ({ week, studentName }: WeeklyBreakdownCardProps) => {
  const navigate = useNavigate();
  
  const handleRepoLink = async () => {
    const url = await fetchStudentRepoLink(week.week, studentName, cohort_name);
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleInstructionsClick = () => {
    navigate(`/instructions/${week.week}`);
  };

  const handleDiscordClick = (weekNumber: number) => {
    const discordLink = groupInvite[weekNumber];
    if (discordLink) {
      window.open(discordLink, '_blank');
    }
  };

  const renderScoreBar = (value: number, max: number) => (
    <div className="flex items-center space-x-2">
      <div className="w-20 bg-zinc-700 border border-orange-400 h-2">
        <div 
          className={`bg-orange-400 h-2 transition-all`}
          style={{ width: `${(value / max) * 100}%` }}
        />
      </div>
      <span className="text-sm font-medium w-8 text-orange-300">{value}</span>
    </div>
  );

  const renderBooleanScore = (isTrue: boolean, points: number) => (
    <span className={`inline-flex px-2 py-1 border text-xs font-medium ${
      isTrue ? 'bg-zinc-700 text-orange-300 border-orange-400' : 'bg-zinc-800 text-orange-200 border-orange-600'
    }`}>
      {isTrue ? `✓ ${points} pts` : `✗ 0 pts`}
    </span>
  );

  return (
    <div className="bg-zinc-900 border border-orange-300 shadow-2xl font-mono rounded-lg overflow-hidden">
      {/* Terminal Window Header */}
      <div className="bg-zinc-700 px-4 py-3 flex items-center space-x-2 border-b border-orange-300">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        </div>
        <div className="flex-1 text-center">
          <span className="text-gray-300 text-sm">Terminal — week_{week.week}_details.sh</span>
        </div>
      </div>

      {/* Terminal Content */}
      <div className="p-6 bg-zinc-900">
        {/* Terminal command header */}
        <div className="mb-4 pb-3 border-b border-orange-300">
          <div className="text-orange-300">
            <span className="text-orange-400">user@{studentName}:~$</span> week_{week.week}_details.sh
          </div>
          <div className="text-orange-200 text-sm mt-1">
            Displaying detailed breakdown for Week {week.week}
          </div>
        </div>

      {/* Week Header */}
      <div className="flex items-center justify-between mb-6 border-b border-orange-300 pb-4">
        <div className="flex items-center space-x-4">
          <div>
            <h3 className="text-xl font-semibold text-orange-300">
              <span className="text-orange-400">[{week.week.toString().padStart(2, '0')}]</span> Week {week.week}
            </h3>
            <div className="flex items-center space-x-4 mt-1">

              <span className={`inline-flex px-2 py-1 border text-xs font-medium ${
                week.attendance ? 'bg-zinc-800 text-orange-300 border-orange-400' : 'bg-zinc-800 text-orange-200 border-orange-600'
              }`}>
                {week.attendance ? 'Present' : 'Absent'}
              </span>
              <span className="inline-flex px-3 py-1 bg-orange-400 text-zinc-900 font-bold text-sm border border-orange-300 rounded">
                GROUP: {week.group}
              </span>
              <span className="inline-flex px-3 py-1 bg-zinc-700 text-orange-300 font-semibold text-sm border border-orange-400 rounded">
                TA: {week.ta}
              </span>
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-sm text-orange-400">Total Score</div>
          <div className="text-2xl font-bold text-orange-300">
            {computeTotal({ gdScore: week.gdScore, bonusScore: week.bonusScore, exerciseScore: week.exerciseScore })}
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* GD Scores */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-orange-400 uppercase tracking-wider border-b border-orange-400 pb-1">GD Scores</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-orange-200">Communication (FA)</span>
              {renderScoreBar(week.gdScore.fa, 5)}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-orange-200">Depth of Answer (FB)</span>
              {renderScoreBar(week.gdScore.fb, 5)}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-orange-200">Technical Fluency (FC)</span>
              {renderScoreBar(week.gdScore.fc, 5)}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-orange-200">Engagement (FD)</span>
              {renderScoreBar(week.gdScore.fd, 5)}
            </div>
            <div className="pt-2 border-t border-orange-400">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-orange-300">GD Total</span>
                <span className="text-lg font-bold text-orange-300">
                  {computeGdTotal(week.gdScore).toFixed(0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bonus Scores */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-orange-400 uppercase tracking-wider border-b border-orange-400 pb-1">Bonus Scores</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-orange-200">Attempt</span>
              {renderScoreBar(week.bonusScore.attempt, 5)}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-orange-200">Quality</span>
              {renderScoreBar(week.bonusScore.good, 5)}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-orange-200">Follow Up</span>
              {renderScoreBar(week.bonusScore.followUp, 5)}
            </div>
            <div className="pt-2 border-t border-orange-400">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-orange-300">Bonus Total</span>
                <span className="text-lg font-bold text-orange-300">
                  {computeBonusTotal(week.bonusScore)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Exercise Scores */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-orange-400 uppercase tracking-wider border-b border-orange-400 pb-1">Exercise Scores</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-orange-200">Submitted</span>
              {renderBooleanScore(week.exerciseScore.Submitted, 10)}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-orange-200">Tests Pass</span>
              {renderBooleanScore(week.exerciseScore.privateTest, 50)}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-orange-200">Good Structure</span>
              {renderBooleanScore(week.exerciseScore.goodStructure, 20)}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-orange-200">Good Documentation</span>
              {renderBooleanScore(week.exerciseScore.goodDoc, 20)}
            </div>
            <div className="pt-2 border-t border-orange-400">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-orange-300">Exercise Total</span>
                <span className="text-lg font-bold text-orange-300">
                  {computeExerciseTotal(week.exerciseScore)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 pt-6 border-t border-orange-300 space-y-3">
        {/* Instructions Button */}
        <button 
          onClick={handleInstructionsClick}
          className="b-0 bg-orange-300 flex items-center space-x-2 hover:bg-orange-400 rounded-md border border-orange-300 hover:border-orange-400 p-3 transition-colors w-full justify-center"
        >
          <BookOpen className="h-4 w-4" />
          <span>Go to Week {week.week} Instructions</span>
        </button>

         
        <button 
          onClick={handleDiscordClick.bind(null, week.week)}
          className="bg-zinc-800 text-orange-300 font-bold text-base flex items-center space-x-3 border-2 border-orange-400 hover:bg-zinc-700 hover:border-orange-300 hover:text-orange-200 p-4 transition-colors w-full justify-center font-mono"
        >
          <span className="text-orange-400">►</span>
          <span>JOIN DISCORD GROUP [{week.group}]</span>
          <span className="text-orange-400">◄</span>
        </button>

        {/* GitHub Link */}
        {week.exerciseScore.Submitted && (
          <button 
            onClick={handleRepoLink}
            className="flex items-center space-x-2 bg-zinc-700 text-orange-300 hover:bg-zinc-600 border border-orange-300 hover:border-orange-400 p-3 transition-colors w-full justify-center"
          >
            <ExternalLink className="h-4 w-4" />
            <span>→ View GitHub Submission for Week {week.week}</span>
          </button>
        )}
      </div>
      </div>
    </div>
  );
};