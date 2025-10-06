import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';


import { StudentBackground } from '../components/student/StudentBackground';
import { StudentSummary } from '../components/student/StudentSummary';
import { WeeklyProgressChart } from '../components/student/WeeklyProgressChart';
import { WeeklyBreakdownCard } from '../components/student/WeeklyBreakdownCard';

import type { StudentData, StudentBackground as StudentBgType } from '../types/student';
import apiClient from '../services/api';

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
  hasGoodDocumentation: boolean;
  hasGoodStructure: boolean;
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

const StudentDetailPage = () => {
  const [searchParams] = useSearchParams();
  const [scoresData, setScoresData] = useState<ScoresData | null>(null);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);

  useEffect(() => {
    const studentId = searchParams.get('studentId');

    if (studentId) {
      apiClient.get(`/scores/user/${studentId}`)
        .then(response => {
          console.log('Scores data:', response.data);
          setScoresData(response.data);
        })
        .catch(error => {
          console.error('Error fetching scores:', error);
        });
    }
  }, [searchParams]);

  const student: StudentData | null = null;
  const studentBackground: StudentBgType | null = null;

  // Get cohortId from URL params or cohortType to find the right cohort
  const cohortIdParam = searchParams.get('cohortId');
  const cohortTypeParam = searchParams.get('cohortType');

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

  // Calculate stats
  const totalWeeks = selectedCohort?.weeklyScores?.length || 0;
  const attendedWeeks = selectedCohort?.weeklyScores?.filter(w => w.groupDiscussionScores.attendance).length || 0;

  const stats = {
    totalScore: scoresData?.totalScore || 0,
    maxPossibleScore: scoresData?.maxTotalScore || 0,
    avgScore: totalWeeks > 0 ? (scoresData?.totalScore || 0) / totalWeeks : 0,
    attendanceRate: totalWeeks > 0 ? (attendedWeeks / totalWeeks) * 100 : 0,
    overallPercentage: (scoresData?.maxTotalScore || 0) > 0 ? ((scoresData?.totalScore || 0) / (scoresData?.maxTotalScore || 0)) * 100 : 0,
    attendedWeeks: attendedWeeks,
  };

  // Prepare weekly data for WeeklyBreakdownCard
  const validWeeks = selectedCohort?.weeklyScores?.map((weekScore, index) => ({
    week: index,
    weekId: weekScore.weekId,
    totalScore: weekScore.totalScore,
    maxTotalScore: weekScore.maxTotalScore,
    groupDiscussionScores: weekScore.groupDiscussionScores,
    exerciseScores: weekScore.exerciseScores,
    attendance: weekScore.groupDiscussionScores.attendance,
  })) || [];

  // Prepare weekly data for WeeklyProgressChart (old format)
  const chartWeeklyData = selectedCohort?.weeklyScores?.map((weekScore, index) => ({
    week: index,
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
      Submitted: weekScore.exerciseScores.isSubmitted,
      privateTest: weekScore.exerciseScores.isPassing,
      goodDoc: weekScore.exerciseScores.hasGoodDocumentation,
      goodStructure: weekScore.exerciseScores.hasGoodStructure,
    },
    total: weekScore.totalScore / weekScore.maxTotalScore,
    totalScore: weekScore.totalScore,
    maxTotalScore: weekScore.maxTotalScore,
    group: weekScore.groupDiscussionScores.groupNumber?.toString() || null,
    ta: 'TBD',
  })) || [];


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

            {/* Navigation and Actions */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => {}}
                className="b-0 rounded-md flex items-center space-x-2 bg-zinc-700 text-orange-300 hover:bg-zinc-600 border border-orange-300 hover:border-orange-400 p-2 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Students</span>
              </button>

              <div className="flex items-center space-x-4">
                <button
                  onClick={() => {}}
                  className="b-0 rounded-md flex items-center space-x-2 px-4 py-2 bg-zinc-700 text-orange-300 hover:bg-zinc-600 border border-orange-400 transition-colors font-mono"
                >
                  <span className="text-orange-400">►</span>
                  <span>General Instructions</span>
                </button>

                <button
                  onClick={() => {}}
                  className="b-0 rounded-md flex items-center space-x-2 px-4 py-2 bg-zinc-700 text-orange-300 hover:bg-zinc-600 border border-orange-400 transition-colors font-mono"
                >
                  <span className="text-orange-400">►</span>
                  <span>View Leaderboard</span>
                </button>

                <button
                  onClick={() => {}}
                  className="b-0 rounded-md flex items-center space-x-2 px-4 py-2 bg-orange-400 text-zinc-900 hover:bg-orange-500 border border-orange-300 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Export Data</span>
                </button>
              </div>
            </div>
            
            {/* Student Info */}
            <div className="mb-6 pb-4 border-b border-orange-400">
              <div className="flex items-center space-x-6">
                <div>
                  <h1 className="text-3xl font-bold text-orange-300 cursor-pointer hover:text-orange-400 transition-colors" onClick={() => {}}>{student?.name}</h1>
                  <div className="flex items-center space-x-6 text-orange-200 mt-2">
                    <span className="text-orange-400">[EMAIL]</span>
                    <span>{student?.email}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Student Background */}
            {studentBackground && (
              <div className="mb-6">
                <StudentBackground background={studentBackground} />
              </div>
            )}

            {/* Summary Stats */}
            <div className="mb-6">
              <StudentSummary stats={stats} />
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
                  Week {currentWeekIndex} of {validWeeks.length - 1}
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
              studentName={student?.name || ''}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDetailPage;