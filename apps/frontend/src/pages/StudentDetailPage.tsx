import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {  Calendar, ChevronLeft, ChevronRight } from 'lucide-react';


import { StudentSummary } from '../components/student/StudentSummary';
import { WeeklyProgressChart } from '../components/student/WeeklyProgressChart';
import { WeeklyBreakdownCard } from '../components/student/WeeklyBreakdownCard';

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

interface StudentInfo {
  name: string;
  email: string;
}

const StudentDetailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [scoresData, setScoresData] = useState<ScoresData | null>(null);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(1);

  useEffect(() => {
    const studentId = searchParams.get('studentId');
    const studentName = searchParams.get('studentName');
    const studentEmail = searchParams.get('studentEmail');

    if (studentId) {
      // Set student info from URL params if available
      if (studentName || studentEmail) {
        setStudentInfo({
          name: studentName || 'Unknown',
          email: studentEmail || 'N/A',
        });
      }

      // Fetch scores data
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
  })).filter((weekData) => weekData.week !== 0) || [];


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
                    <span className="text-orange-400 font-semibold">EMAIL:</span>
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
                {selectedCohort && selectedCohort.cohortType === "MASTERING_BITCOIN" && (
                  <div className="mt-4 pt-3 border-t border-zinc-700">
                    <button
                      onClick={() => navigate('/mb-instructions')}
                      className="px-4 py-2 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      View MB Instructions
                    </button>
                  </div>
                )}
              </div>
            )} 

            {/* Navigation and Actions */}



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
              studentName={studentInfo?.name || ''}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDetailPage;