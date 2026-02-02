import { useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useCohort } from "../hooks/cohortHooks";
import { useCohortLeaderboard } from "../hooks/scoreHooks";
import { useUser } from "../hooks/userHooks";

import { UserRole } from "../types/enums";
import {
  type StudentResult,
  transformLeaderboardData,
  sortResults,
  formatCohortName,
  getErrorMessage,
  getScoreColorClass,
  getRankStyling,
} from "../utils/resultHelper";
import { cohortHasExercises } from "../utils/calculations";

/* ------------------------------
   Component
------------------------------ */

export const ResultPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: cohortIdParam } = useParams<{ id: string }>();

  /* ------------------------------
     Fetch Data
  ------------------------------ */

  const { data: userData } = useUser();

  const {
    data: cohortData,
    isLoading: cohortLoading,
    error: cohortError,
  } = useCohort(cohortIdParam);

  /*  Leaderboard Query (Fixed Stale Cache Issue) */
  const {
    data: leaderboardData,
    isLoading: leaderboardLoading,
    error: leaderboardError,
  } = useCohortLeaderboard(
    { cohortId: cohortIdParam || "" },
    {
      enabled: !!cohortIdParam,

      /*  Always Fetch Latest Data */
      refetchOnMount: "always",
      refetchOnWindowFocus: true,
      staleTime: 0,
    }
  );

  /* ------------------------------
     Permissions
  ------------------------------ */

  const canViewAttendance = useMemo(() => {
    return (
      userData?.role === UserRole.ADMIN ||
      userData?.role === UserRole.TEACHING_ASSISTANT
    );
  }, [userData?.role]);

  const hasExercises = useMemo(
    () => cohortHasExercises(cohortData?.type || ""),
    [cohortData?.type]
  );

  /* ------------------------------
     Transform Leaderboard Data
  ------------------------------ */

  const results = useMemo<StudentResult[]>(
    () => transformLeaderboardData(leaderboardData),
    [leaderboardData]
  );

  /* ------------------------------
     Sorting
  ------------------------------ */

  const sortedResults = useMemo(() => sortResults(results), [results]);

  /* ------------------------------
     Cohort Display Name
  ------------------------------ */

  const cohortName = useMemo(
    () => formatCohortName(cohortData),
    [cohortData]
  );

  /* ------------------------------
     Navigation Handler
  ------------------------------ */

  const handleStudentClick = useCallback(
    (student: StudentResult) => {
      if (!cohortData) return;

      navigate(
        `/detailPage?studentId=${student.userId}` +
          `&cohortType=${cohortData.type}` +
          `&cohortId=${cohortData.id}` +
          `&studentName=${encodeURIComponent(student.name)}` +
          `&studentDiscord=${encodeURIComponent(student.discordUsername)}` +
          `&from=results`
      );
    },
    [navigate, cohortData]
  );

  /* ------------------------------
     Loading + Error States
  ------------------------------ */

  const loading = cohortLoading || leaderboardLoading;

  const error =
    getErrorMessage(cohortError) || getErrorMessage(leaderboardError);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <p className="text-white font-inter">Loading results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <p className="text-red-400 font-inter">
          Failed to load leaderboard: {error}
        </p>
      </div>
    );
  }

  /* ------------------------------
     Render
  ------------------------------ */

  return (
    <div className="min-h-screen bg-zinc-900 flex justify-center p-4 md:p-8">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-5xl font-bold text-white font-inter">
            Cohort Leaderboard
          </h1>

          <p className="text-zinc-400 mt-2 font-inter">
            {cohortName || "Cohort information unavailable"}
          </p>
        </div>

        {/* Table */}
        <div className="bg-zinc-800/80 rounded-xl border border-zinc-700 overflow-x-auto">
          <table className="w-full">
            <colgroup>
              <col className="w-16" />
              <col className="min-w-[200px]" />
              {canViewAttendance && <col className="w-40" />}
              <col className="w-32" />
              {hasExercises && <col className="w-40" />}
            </colgroup>

            <thead>
              <tr className="bg-zinc-700/50 border-b border-zinc-600">
                <th className="p-4 text-left text-sm text-zinc-300 font-semibold">
                  Rank
                </th>

                <th className="p-4 text-left text-sm text-zinc-300 font-semibold">
                  Discord
                </th>

                {canViewAttendance && (
                  <th className="p-4 text-left text-sm text-zinc-300 font-semibold">
                    Attendance
                  </th>
                )}

                <th className="p-4 text-left text-sm text-zinc-300 font-semibold">
                  Score
                </th>

                {hasExercises && (
                  <th className="p-4 text-left text-sm text-zinc-300 font-semibold">
                    Exercises Completed
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {sortedResults.map((student, index) => {
                const rank = index + 1;

                return (
                  <tr
                    key={student.userId}
                    onClick={() => handleStudentClick(student)}
                    className="border-b border-zinc-700/30 hover:bg-zinc-700/20 cursor-pointer transition"
                  >
                    {/* Rank */}
                    <td className="p-4">
                      <span className={getRankStyling(rank)}>#{rank}</span>
                    </td>

                    {/* Discord */}
                    <td className="p-4 text-white truncate">
                      {student.discordUsername}
                    </td>

                    {/* Attendance */}
                    {canViewAttendance && (
                      <td className="p-4 text-zinc-300">
                        {student.totalAttendance} / {student.maxAttendance}
                      </td>
                    )}

                    {/* Score */}
                    <td className="p-4">
                      <span
                        className={`font-semibold ${getScoreColorClass(
                          student.totalScore
                        )}`}
                      >
                        {student.totalScore}
                      </span>
                    </td>

                    {/* Exercises */}
                    {hasExercises && (
                      <td className="p-4 text-zinc-300 font-semibold">
                        {student.exercisesCompleted}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Info */}
        <div className="mt-4 text-center text-zinc-400 text-sm font-inter">
          Showing {sortedResults.length} students
        </div>

        {/* Empty State */}
        {sortedResults.length === 0 && (
          <div className="text-center text-zinc-400 mt-10">
            No students found for this cohort.
          </div>
        )}
      </div>
    </div>
  );
};
