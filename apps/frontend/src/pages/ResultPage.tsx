import { useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { useCohort } from '../hooks/cohortHooks';
import { useScoresForCohortAndWeek } from '../hooks/scoreHooks';
import apiService from '../services/apiService';
import type { UsersWeekScoreResponseDto } from '../types/api';

// API Response Types (matching your Rust RowData struct)

// Frontend Display Types
interface StudentResult {
  userId: string;
  name: string;
  discordUsername: string;
  email: string;
  total_score: number;
  attendance_count: number;
  total_weeks: number;
}

// Props interface (if you need to pass props later)
type ResultPageProps = object

export const ResultPage: React.FC<ResultPageProps> = () => {
  const navigate = useNavigate();
  const { id: cohortIdParam } = useParams<{ id: string }>();

  // Fetch specific cohort
  const { data: cohortData, isLoading: cohortsLoading, error: cohortsError } = useCohort(cohortIdParam);

  // Create array of all cohort-week combinations for this cohort
  const cohortWeekPairs = useMemo(() => {
    if (!cohortData?.weeks?.length || !cohortData?.id) return [];
    return cohortData.weeks.map(week => ({
      cohortId: cohortData.id,
      weekId: week.id,
    }));
  }, [cohortData]);

  // Fetch scores for all cohort-week combinations using useQueries
  // This uses the same query keys as useScoresForCohortAndWeek hook
  const scoresQueries = useQueries({
    queries: cohortWeekPairs.map(({ cohortId, weekId }) => ({
      queryKey: useScoresForCohortAndWeek.queryKey({ cohortId, weekId }),
      queryFn: () => apiService.listScoresForCohortAndWeek(cohortId, weekId),
      enabled: cohortWeekPairs.length > 0,
    })),
  });

  // Check if any scores are still loading
  const scoresLoading = scoresQueries.some(query => query.isLoading);
  const scoresError = scoresQueries.find(query => query.error)?.error;

  // Consolidate scores from all weeks per person
  const results = useMemo<StudentResult[]>(() => {
    if (scoresLoading) return [];

    const studentScoresMap = new Map<string, StudentResult>();

    scoresQueries.forEach(query => {
      if (!query.data?.scores) return;

      query.data.scores.forEach((score: UsersWeekScoreResponseDto) => {
        const userId = score.userId;
        const existing = studentScoresMap.get(userId);
        const wasPresent = score.groupDiscussionScores?.attendance ?? false;

        if (existing) {
          // Consolidate scores
          existing.total_score += score.totalScore ?? 0;
          existing.total_weeks += 1;
          if (wasPresent) {
            existing.attendance_count += 1;
          }
        } else {
          // Create new entry
          studentScoresMap.set(userId, {
            userId: userId,
            name: score.name ?? score.discordGlobalName ?? score.discordUsername ?? 'Unknown',
            discordUsername: score.discordUsername ?? 'N/A',
            email: '', // Not available in API response
            total_score: score.totalScore ?? 0,
            attendance_count: wasPresent ? 1 : 0,
            total_weeks: 1,
          });
        }
      });
    });

    // Filter out students with 0 total score and return as array
    return Array.from(studentScoresMap.values()).filter(student => student.total_score > 0);
  }, [scoresQueries, scoresLoading]);

  const loading = cohortsLoading || scoresLoading;
  const error = cohortsError ? String(cohortsError) : scoresError ? String(scoresError) : null;

  // Get cohort name for display
  const cohortName = useMemo(() => {
    if (!cohortData) return '';
    const typeName = cohortData.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    return `${typeName} - Season ${cohortData.season}`;
  }, [cohortData]);

  // Apply default sorting: attendance → total score → name
  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => {
      // First, sort by attendance count (descending)
      if (b.attendance_count !== a.attendance_count) {
        return b.attendance_count - a.attendance_count;
      }

      // Then, sort by total score (descending)
      if (b.total_score !== a.total_score) {
        return b.total_score - a.total_score;
      }

      // Finally, sort by name (ascending) as tiebreaker
      return a.name.localeCompare(b.name);
    });
  }, [results]);


 const handleStudentClick = useCallback((student: StudentResult) => {
    const studentId = student.userId ;
    const cohortType = cohortData?.type;
    const cohortId = cohortData?.id;
    navigate(`/detailPage?studentId=${studentId}&cohortType=${cohortType}&cohortId=${cohortId}`);
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
              {/* Mobile: Only 3 columns */}
              <col className="w-16" />
              <col className="min-w-[120px]" />
              <col className="hidden md:table-column md:w-48" />
              <col className="hidden md:table-column md:w-32" />
              <col className="w-24 md:w-32" />
            </colgroup>
            <thead>
              <tr className="bg-zinc-700/50 border-b border-zinc-600/50">
                <th className="text-left p-2 md:p-4 text-xs md:text-sm font-semibold text-zinc-300 font-inter">Rank</th>
                <th className="text-left p-2 md:p-4 text-xs md:text-sm font-semibold text-zinc-300 font-inter">Name</th>
                <th className="hidden md:table-cell text-left p-2 md:p-4 text-xs md:text-sm font-semibold text-zinc-300 font-inter">Discord</th>
                <th className="hidden md:table-cell text-left p-2 md:p-4 text-xs md:text-sm font-semibold text-zinc-300 font-inter">Attendance</th>
                <th className="text-left p-2 md:p-4 text-xs md:text-sm font-semibold text-zinc-300 font-inter">
                  <span className="md:hidden">Score</span>
                  <span className="hidden md:inline">Total Score</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedResults.map((student: StudentResult, index: number) => {
                const rank = index + 1;
                return (
                  <tr
                    key={`${student.email}-${index}`}
                    className="border-b border-zinc-700/30 hover:bg-zinc-700/20 transition-colors duration-200"
                  >
                    <td className="p-2 md:p-4 font-inter">
                      <span className={getRankStyling(rank)}>#{rank}</span>
                    </td>
                    <td
                      className="p-2 md:p-4 text-white font-inter truncate cursor-pointer text-sm md:text-base"
                      onClick={() => handleStudentClick(student)}
                      title={student.name}
                    >
                      {student.name}
                    </td>
                    <td className="hidden md:table-cell p-2 md:p-4 font-inter truncate" title={student.discordUsername}>
                      <span className="text-zinc-300">
                        {student.discordUsername}
                      </span>
                    </td>
                    <td className="hidden md:table-cell p-2 md:p-4 font-inter">
                      <span className="text-zinc-300">
                        {student.attendance_count}/{student.total_weeks}
                      </span>
                    </td>
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