import { getScoreColor } from '../../utils/calculations';

interface StudentSummaryProps {
  stats: {
    totalScore: number;
    avgScore: number;
    attendanceRate: number;
    overallPercentage: number;
    attendedWeeks: number;
    maxPossibleScore: number;
  };
}

export const StudentSummary = ({ stats }: StudentSummaryProps) => {

  console.log(stats,"stats");
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
      <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-6 text-center">
        <div className="text-3xl font-bold text-zinc-100">{stats.totalScore}</div>
        <div className="text-sm text-zinc-400 mt-1">Total Score</div>
        <div className="text-xs text-zinc-500">of {stats.maxPossibleScore}</div>
      </div>
      
      <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-6 text-center">
        <div className="text-3xl font-bold text-zinc-100">{Math.round(stats.avgScore)}</div>
        <div className="text-sm text-zinc-400 mt-1">Average Score</div>
        <div className="text-xs text-zinc-500">per week</div>
      </div>
      
      <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-6 text-center">
        <div className={`text-3xl font-bold ${getScoreColor(stats.attendanceRate, 100)}`}>
          {Math.round(stats.attendanceRate)}%
        </div>
        <div className="text-sm text-zinc-400 mt-1">Attendance</div>
        <div className="text-xs text-zinc-500">{stats.attendedWeeks}/{6} weeks</div>
      </div>
      
      <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-6 text-center">
        <div className={`text-3xl font-bold ${getScoreColor(stats.overallPercentage, 100)}`}>
          {Math.round(stats.overallPercentage)}%
        </div>
        <div className="text-sm text-zinc-400 mt-1">Overall</div>
        <div className="text-xs text-zinc-500">performance</div>
      </div>
      
      <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-6 text-center">
        <div className="text-3xl font-bold text-zinc-100">{stats.attendedWeeks}</div>
        <div className="text-sm text-zinc-400 mt-1">Weeks</div>
        <div className="text-xs text-zinc-500">completed</div>
      </div>
    </div>
  );
};