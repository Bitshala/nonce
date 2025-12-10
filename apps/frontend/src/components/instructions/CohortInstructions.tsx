import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../hooks/userHooks';
import { useMyScores } from '../../hooks/scoreHooks';
import { UserRole } from '../../types/enums';
import InstructionsLayout from './InstructionsLayout';
import type { WeekContent } from '../../types/instructions';

interface CohortInstructionsProps {
  cohortType: 'MASTERING_BITCOIN' | 'LEARNING_BITCOIN_FROM_COMMAND_LINE' | 'MASTERING_LIGHTNING_NETWORK';
  cohortName: string;
  weeklyContent: WeekContent[];
}

const CohortInstructions: React.FC<CohortInstructionsProps> = ({
  cohortType,
  cohortName,
  weeklyContent,
}) => {
  const navigate = useNavigate();
  const [activeWeek, setActiveWeek] = useState<number | 'links' | 'exercises'>(1);
  const [error, setError] = useState<string | null>(null);

  // Use hooks for data fetching
  const { data: userData, isLoading: isLoadingUser } = useUser();
  const { data: scoresData, isLoading: isLoadingScores } = useMyScores();

  // Check if user is TA or Admin
  const isAdminOrTA = userData?.role === UserRole.ADMIN || userData?.role === UserRole.TEACHING_ASSISTANT;

  // Derive access from scoresData or admin/TA role
  const hasAccess = isAdminOrTA || (scoresData?.cohorts.some(
    (record) => record.cohortType === cohortType
  ) ?? false);

  // Admins and TAs can view bonus questions
  const canViewBonusQuestions = isAdminOrTA;

  const isLoading = isLoadingUser || isLoadingScores;

  // Set error if user doesn't have access
  useEffect(() => {
    if (!isLoading && scoresData && !hasAccess) {
      setError(`You need to be enrolled in a ${cohortType.replace(/_/g, ' ')} cohort to access these instructions.`);
    }
  }, [isLoading, scoresData, hasAccess, cohortType]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-white font-medium">Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 px-4 py-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="bg-zinc-800/80 backdrop-blur-sm border border-zinc-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white">Access Restricted</h1>
              <p className="text-zinc-300 max-w-md mx-auto">
                {error || `You need to be enrolled in a ${cohortType.replace(/_/g, ' ')} cohort to access these instructions.`}
              </p>
              <div className="flex justify-center space-x-4 mt-6">
                <button
                  onClick={() => navigate('/me')}
                  className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white font-semibold rounded-xl hover:from-orange-700 hover:to-orange-800 focus:ring-2 focus:ring-orange-500/50 focus:outline-none transition-all duration-200"
                >
                  View Profile & Cohorts
                </button>
                <button
                  onClick={() => navigate('/me')}
                  className="px-6 py-3 bg-zinc-700 text-white font-semibold rounded-xl hover:bg-zinc-600 focus:ring-2 focus:ring-zinc-500/50 focus:outline-none transition-all duration-200"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <InstructionsLayout
      cohortName={cohortName}
      cohortType={cohortType}
      weeklyContent={weeklyContent}
      activeWeek={activeWeek}
      setActiveWeek={setActiveWeek}
      canViewBonusQuestions={canViewBonusQuestions}
    />
  );
};

export default CohortInstructions;
