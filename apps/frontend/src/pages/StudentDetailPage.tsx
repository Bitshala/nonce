/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {  Calendar, ChevronLeft, ChevronRight } from 'lucide-react';


import { StudentSummary } from '../components/student/StudentSummary';
import { WeeklyProgressChart } from '../components/student/WeeklyProgressChart';
import { WeeklyBreakdownCard } from '../components/student/WeeklyBreakdownCard';
import { ProfileDataCard } from '../components/student/ProfileDataCard';

import { useCohort } from '../hooks/cohortHooks';
import { useUserScores, useMyScores } from '../hooks/scoreHooks';
import { useUser, useUserById } from '../hooks/userHooks';
import { UserRole } from '../types/enums';
import { cohortHasExercises } from '../utils/calculations';

interface GroupDiscussionScores {
  id: string;
  attendance: boolean;
  communicationScore: number;
  maxCommunicationScore: number;
  depthOfAnswerScore: number;
  maxDepthOfAnswerScore: number;
  technicalBitcoinFluencyScore: number;
  maxTechnicalBitcoinFluencyScore: number;
  engagementScore: number;
  maxEngagementScore: number;
  isBonusAttempted: boolean;
  bonusAnswerScore: number;
  maxBonusAnswerScore: number;
  bonusFollowupScore: number;
  maxBonusFollowupScore: number;
  totalScore: number;
  maxTotalScore: number;
  groupNumber: number | null;
}

interface ExerciseScores {
  id: string;
  isSubmitted: boolean;
  isPassing: boolean;
  totalScore: number;
  maxTotalScore: number;
}

interface WeeklyScore {
  weekId: string;
  groupDiscussionScores: GroupDiscussionScores;
  exerciseScores: ExerciseScores;
  totalScore: number;
  maxTotalScore: number;
}

interface Cohort {
  cohortId: string;
  cohortType: string;
  seasonNumber: number;
  weeklyScores: WeeklyScore[];
  totalScore: number;
  maxTotalScore: number;
}

interface ScoresData {
  cohorts: Cohort[];
  totalScore: number;
  maxTotalScore: number;
}

interface StudentInfo {
  name: string;
  email: string;
}

const StudentDetailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);

  // Get cohortId and studentId from URL params
  const cohortIdParam = searchParams.get('cohortId');
  const cohortTypeParam = searchParams.get('cohortType');
  const studentId = searchParams.get('studentId');
  const fromSource = searchParams.get('from'); // 'table' or 'results'

  // Fetch cohort data using the hook
  const { data: cohortData } = useCohort(cohortIdParam);

  // Get current user to determine role
  const { data: currentUser } = useUser();

  // Determine if we should use student's own scores or fetch another user's scores
  const isViewingOwnProfile = currentUser?.id === studentId;
  const canViewOtherScores = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.TEACHING_ASSISTANT;

  // Fetch scores data - use appropriate hook based on whether viewing own profile
  const { data: myScoresData } = useMyScores(undefined, { enabled: isViewingOwnProfile });
  const { data: userScoresData } = useUserScores(studentId || '', { enabled: !isViewingOwnProfile && canViewOtherScores && !!studentId });

  // Use the appropriate scores data
  const scoresData = isViewingOwnProfile ? myScoresData : userScoresData;

  // Fetch student profile data by ID (only for TAs and Admins)
  const { data: studentProfileData } = useUserById(studentId || '', { enabled: canViewOtherScores && !!studentId });

  useEffect(() => {
    const studentName = searchParams.get('studentName');
    const studentEmail = searchParams.get('studentEmail');

    // Set student info from URL params if available
    if (studentName || studentEmail) {
      setStudentInfo({
        name: studentName || 'Unknown',
        email: studentEmail || 'N/A',
      });
    }
  }, [searchParams]);

  // Find the selected cohort
  const selectedCohort = scoresData?.cohorts.find(cohort => {
    if (cohortIdParam) {
      return cohort.cohortId === cohortIdParam;
    }
    if (cohortTypeParam) {
      return cohort.cohortType === cohortTypeParam;
    }
    return false;
  }) || scoresData?.cohorts[0]; // Default to first cohort if no match or no param

  // Sort weeks from the cohort API response (0 to n)
  const sortedCohortWeeks = useMemo(() => {
    if (!cohortData?.weeks) return [];
    return [...cohortData.weeks].sort((a, b) => a.week - b.week);
  }, [cohortData?.weeks]);

  // Create a map of weekId to week number for easy lookup
  const weekIdToNumberMap = useMemo(() => {
    const map = new Map<string, number>();
    sortedCohortWeeks.forEach(week => {
      map.set(week.id, week.week);
    });
    return map;
  }, [sortedCohortWeeks]);

  // Sort the student's weekly scores based on the cohort's week order
  const sortedWeeklyScores = useMemo(() => {
    if (!selectedCohort?.weeklyScores) return [];
    return [...selectedCohort.weeklyScores].sort((a, b) => {
      const weekNumA = weekIdToNumberMap.get(a.weekId) ?? 0;
      const weekNumB = weekIdToNumberMap.get(b.weekId) ?? 0;
      return weekNumA - weekNumB;
    });
  }, [selectedCohort?.weeklyScores, weekIdToNumberMap]);

  // Calculate stats for the selected cohort only
  const totalWeeks = sortedWeeklyScores.length || 0;
  const attendedWeeks = sortedWeeklyScores.filter(w => w.groupDiscussionScores.attendance).length || 0;

  // Check if cohort has exercises
  const hasExercises = cohortHasExercises(selectedCohort?.cohortType || '');

  const stats = {
    totalScore: selectedCohort?.totalScore || 0,
    maxPossibleScore: selectedCohort?.maxTotalScore || 0,
    avgScore: totalWeeks > 0 ? (selectedCohort?.totalScore || 0) / totalWeeks : 0,
    attendanceRate: totalWeeks > 0 ? (attendedWeeks / totalWeeks) * 100 : 0,
    overallPercentage: (selectedCohort?.maxTotalScore || 0) > 0 ? ((selectedCohort?.totalScore || 0) / (selectedCohort?.maxTotalScore || 0)) * 100 : 0,
    attendedWeeks: attendedWeeks,
    totalWeeks: totalWeeks,
  };

  // Prepare weekly data for WeeklyBreakdownCard (filter out week 0)
  const validWeeks = sortedWeeklyScores
    .map((weekScore) => {
      const weekNumber = weekIdToNumberMap.get(weekScore.weekId) ?? 0;
      return {
        week: weekNumber,
        weekId: weekScore.weekId,
        totalScore: weekScore.totalScore,
        maxTotalScore: weekScore.maxTotalScore,
        groupDiscussionScores: weekScore.groupDiscussionScores,
        exerciseScores: weekScore.exerciseScores,
        attendance: weekScore.groupDiscussionScores.attendance,
      };
    })
    .filter((week) => week.week !== 0);

  // Prepare weekly data for WeeklyProgressChart (old format)
  const chartWeeklyData = sortedWeeklyScores.map((weekScore) => {
    const weekNumber = weekIdToNumberMap.get(weekScore.weekId) ?? 0;
    return {
      week: weekNumber,
      attendance: weekScore.groupDiscussionScores.attendance,
      gdScore: {
        fa: weekScore.groupDiscussionScores.communicationScore,
        fb: weekScore.groupDiscussionScores.depthOfAnswerScore,
        fc: weekScore.groupDiscussionScores.technicalBitcoinFluencyScore,
        fd: weekScore.groupDiscussionScores.engagementScore,
      },
      bonusScore: {
        attempt: weekScore.groupDiscussionScores.bonusAnswerScore,
        good: weekScore.groupDiscussionScores.bonusAnswerScore,
        followUp: weekScore.groupDiscussionScores.bonusFollowupScore,
      },
      exerciseScore: {
        Submitted: weekScore.exerciseScores?.isSubmitted ?? false,
        privateTest: weekScore.exerciseScores?.isPassing ?? false,
      },
      total: weekScore.totalScore / weekScore.maxTotalScore,
      totalScore: weekScore.totalScore,
      maxTotalScore: weekScore.maxTotalScore,
      group: weekScore.groupDiscussionScores.groupNumber?.toString() || null,
      ta: 'TBD',
    };
  }).filter((weekData) => weekData.week !== 0);


  return (
    <div className="min-h-screen bg-zinc-800 text-zinc-100">
      {/* Header Terminal Window */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-zinc-900 border border-orange-300 shadow-2xl font-mono rounded-lg overflow-hidden">
          {/* Terminal Window Header */}
          <div className="bg-zinc-700 px-4 py-3 flex items-center space-x-2 border-b border-orange-300">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <div className="flex-1 text-center">
              <span className="text-gray-300 text-sm">Terminal — student_profile.sh</span>
            </div>
          </div>

          {/* Terminal Content */}
          <div className="p-6 bg-zinc-900">
            {/* Terminal command header */}
            {studentInfo && (
              <div className="mb-4 pb-3 border-b border-zinc-700">
                <div className="flex items-center space-x-2 text-orange-300 font-mono text-sm">
                  <span className="text-green-400">$</span>
                  <span className="text-zinc-400">cat</span>
                  <span>student_info.txt</span>
                </div>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="text-orange-400 font-semibold">NAME:</span>
                    <span className="text-zinc-300">{studentInfo.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-orange-400 font-semibold">{isViewingOwnProfile ? 'EMAIL:' : 'DISCORD INFO:'}</span>
                    <span className="text-zinc-300">{studentInfo.email}</span>
                  </div>
                  {selectedCohort && (
                    <div className="flex items-center space-x-2">
                      <span className="text-orange-400 font-semibold">COHORT:</span>
                      <span className="text-zinc-300">
                        {selectedCohort.cohortType} - Season {selectedCohort.seasonNumber}
                      </span>
                    </div>
                  )}
                </div>
                {!fromSource && (
                  <div className="mt-4 pt-3 border-t border-zinc-700 flex gap-3">
                    {selectedCohort && (selectedCohort.cohortType === "MASTERING_BITCOIN" || selectedCohort.cohortType === "LEARNING_BITCOIN_FROM_COMMAND_LINE" || selectedCohort.cohortType === "MASTERING_LIGHTNING_NETWORK") && (
                      <button
                        onClick={() => {
                          if (selectedCohort.cohortId) {
                            navigate(`/${selectedCohort.cohortId}/instructions`);
                          } else if (selectedCohort.cohortType === "MASTERING_BITCOIN") {
                            navigate('/mb-instructions');
                          } else if (selectedCohort.cohortType === "LEARNING_BITCOIN_FROM_COMMAND_LINE") {
                            navigate('/lbtcl-instructions');
                          } else if (selectedCohort.cohortType === "MASTERING_LIGHTNING_NETWORK") {
                            navigate('/ln-instructions');
                          }
                        }}
                        className="px-4 py-2 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors border-0"
                      >
                        Cohort Instructions
                      </button>
                    )}
                    {cohortIdParam && (
                      <button
                        onClick={() => navigate(`/results/${cohortIdParam}`)}
                        className="px-4 py-2 bg-orange-400 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors border-0"
                      >
                        View Ranking
                      </button>
                    )}
                  </div>
                )}
              </div>
            )} 

            {/* Navigation and Actions */}



            {/* Summary Stats */}
            <div className="mb-6">
              <StudentSummary stats={stats} hasExercises={hasExercises} />
            </div>
            
            {/* Progress Chart */}
            <WeeklyProgressChart weeklyData={chartWeeklyData} />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Weekly Breakdown */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-zinc-100 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Detailed Weekly Breakdown
            </h2>

            {validWeeks.length > 0 && (
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setCurrentWeekIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentWeekIndex === 0}
                  className="p-2 bg-orange-400 text-white hover:bg-orange-500 border-none rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <span className="text-orange-300 font-mono">
                  Week {validWeeks[currentWeekIndex]?.week || 1} of {validWeeks[validWeeks.length - 1]?.week || validWeeks.length}
                </span>

                <button
                  onClick={() => setCurrentWeekIndex(prev => Math.min(validWeeks.length - 1, prev + 1))}
                  disabled={currentWeekIndex === validWeeks.length - 1}
                  className="p-2 bg-orange-400 text-white hover:bg-orange-500  border-none  rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          {validWeeks.length > 0 && validWeeks[currentWeekIndex] && (
            <WeeklyBreakdownCard
              week={validWeeks[currentWeekIndex]}
              studentName={studentInfo?.name || ''}
              cohortType={selectedCohort?.cohortType}
            />
          )}
        </div>

        {canViewOtherScores && studentProfileData && (
          <ProfileDataCard profile={studentProfileData} />
        )}
      </div>
    </div>
  );
};

export default StudentDetailPage;