import { useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCohort } from '../hooks/cohortHooks';
import { useCohortLeaderboard } from '../hooks/scoreHooks';
import { useUser } from '../hooks/userHooks';
import { UserRole } from '../types/enums';

// Frontend Display Types
interface StudentResult {
  userId: string;
  name: string;
  discordUsername: string;
  email: string;
  total_score: number;
  total_attendance: number;
  max_attendance: number;
}

// Props interface (if you need to pass props later)
type ResultPageProps = object

export const ResultPage: React.FC<ResultPageProps> = () => {
  const navigate = useNavigate();
  const { id: cohortIdParam } = useParams<{ id: string }>();

  // Fetch current user to check role
  const { data: userData } = useUser();

  // Fetch specific cohort
  const { data: cohortData, isLoading: cohortsLoading, error: cohortsError } = useCohort(cohortIdParam);

  // Fetch leaderboard data using the new API endpoint
  const { data: leaderboardData, isLoading: leaderboardLoading, error: leaderboardError } = useCohortLeaderboard(
    { cohortId: cohortIdParam || '' },
    { enabled: !!cohortIdParam }
  );

  // Check if user is TA or Admin
  const canViewAttendance = useMemo(() => {
    return userData?.role === UserRole.ADMIN || userData?.role === UserRole.TEACHING_ASSISTANT;
  }, [userData?.role]);

  console.log('Cohort ID Param:', cohortIdParam);
  console.log('Cohort Data:', cohortData);
  console.log('Leaderboard Data:', leaderboardData);
  console.log('Leaderboard Loading:', leaderboardLoading);
  console.log('Leaderboard Error:', leaderboardError);

  // Transform leaderboard data to StudentResult format
  const results = useMemo<StudentResult[]>(() => {
    // Check if leaderboardData is an array (direct response) or has a leaderboard property
    const leaderboard = Array.isArray(leaderboardData)
      ? leaderboardData
      : leaderboardData?.leaderboard;

    if (!leaderboard) return [];

    return leaderboard
      .filter(entry => entry.totalScore > 0)
      .map(entry => ({
        userId: entry.userId,
        name: entry.name ?? entry.discordGlobalName ?? entry.discordUsername ?? 'Unknown',
        discordUsername: entry.discordUsername ?? 'N/A',
        email: '', // Not available in leaderboard API
        total_score: entry.totalScore,
        total_attendance: entry.totalAttendance,
        max_attendance: entry.maxAttendance,
      }));
  }, [leaderboardData]);

  const loading = cohortsLoading || leaderboardLoading;
  const error = cohortsError ? String(cohortsError) : leaderboardError ? String(leaderboardError) : null;

  // Get cohort name for display
  const cohortName = useMemo(() => {
    if (!cohortData) return '';
    const typeName = cohortData.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    return `${typeName} - Season ${cohortData.season}`;
  }, [cohortData]);

  // Apply default sorting: total score → discord username
  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => {
      // Sort by total score (descending)
      if (b.total_score !== a.total_score) {
        return b.total_score - a.total_score;
      }

      // Then sort by discord username (ascending) as tiebreaker
      return a.discordUsername.localeCompare(b.discordUsername);
    });
  }, [results]);


 const handleStudentClick = useCallback((student: StudentResult) => {
    const studentId = student.userId;
    const cohortType = cohortData?.type;
    const cohortId = cohortData?.id;
    const studentName = encodeURIComponent(student.name);
    const studentDiscord = encodeURIComponent(student.discordUsername);
    navigate(`/detailPage?studentId=${studentId}&cohortType=${cohortType}&cohortId=${cohortId}&studentName=${studentName}&studentEmail=${studentDiscord}&from=results`);
  }, [navigate, cohortData?.type, cohortData?.id]);


  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-white font-inter">Loading results...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-red-400 font-inter">Error: {error}</div>
      </div>
    );
  }

  // Helper function to get score color class
  const getScoreColorClass = (score: number): string => {
    if (score >= 90) return 'text-emerald-400';
    if (score >= 80) return 'text-amber-400';
    return 'text-red-400';
  };

  // Helper function to get rank styling
  const getRankStyling = (rank: number): string => {
    switch (rank) {
      case 1:
        return 'text-yellow-400 font-bold'; // Gold
      case 2:
        return 'text-gray-200 font-bold'; // Silver
      case 3:
        return 'text-amber-600 font-bold'; // Bronze
      default:
        return 'text-zinc-400 font-semibold';
    }
  };




  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-2 font-inter">Cohort Leaderboard</h1>
          <p className="text-zinc-400 font-inter text-sm md:text-base">
            {cohortName || 'Loading cohort information...'}
          </p>
        </div>

        {/* Table */}
        <div className="bg-zinc-800/80 backdrop-blur-sm rounded-xl border border-zinc-700/50 overflow-x-auto">
          <table className="w-full">
            <colgroup>
              <col className="w-16" />
              <col className="min-w-[200px]" />
              {canViewAttendance && <col className="w-32" />}
              <col className="w-32" />
            </colgroup>
            <thead>
              <tr className="bg-zinc-700/50 border-b border-zinc-600/50">
                <th className="text-left p-2 md:p-4 text-xs md:text-sm font-semibold text-zinc-300 font-inter">Rank</th>
                <th className="text-left p-2 md:p-4 text-xs md:text-sm font-semibold text-zinc-300 font-inter">Discord</th>
                {canViewAttendance && (
                  <th className="text-left p-2 md:p-4 text-xs md:text-sm font-semibold text-zinc-300 font-inter">Attendance</th>
                )}
                <th className="text-left p-2 md:p-4 text-xs md:text-sm font-semibold text-zinc-300 font-inter">Total Score</th>
              </tr>
            </thead>
            <tbody>
              {sortedResults.map((student: StudentResult, index: number) => {
                const rank = index + 1;
                return (
                  <tr
                    key={`${student.email}-${index}`}
                    className="border-b border-zinc-700/30 hover:bg-zinc-700/20 transition-colors duration-200 cursor-pointer"
                    onClick={() => handleStudentClick(student)}
                  >
                    <td className="p-2 md:p-4 font-inter">
                      <span className={getRankStyling(rank)}>#{rank}</span>
                    </td>
                    <td className="p-2 md:p-4 font-inter truncate" title={student.discordUsername}>
                      <span className="text-white text-sm md:text-base">
                        {student.discordUsername}
                      </span>
                    </td>
                    {canViewAttendance && (
                      <td className="p-2 md:p-4 font-inter">
                        <span className="text-zinc-300 text-sm md:text-base">
                          {student.total_attendance -1 } / {student.max_attendance - 1}
                        </span>
                      </td>
                    )}
                    <td className="p-2 md:p-4 font-inter">
                      <span className={`font-semibold text-sm md:text-base ${getScoreColorClass(student.total_score)}`}>
                        {student.total_score}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Results Info */}
        <div className="mt-4 text-center text-zinc-400 text-sm font-inter">
          Showing {sortedResults.length} students
        </div>

        {/* No results message */}
        {sortedResults.length === 0 && (
          <div className="text-center text-zinc-400 mt-8">
            <p className="font-inter">No results found with scores greater than 0.</p>
          </div>
        )}
      </div>
    </div>
  );
};