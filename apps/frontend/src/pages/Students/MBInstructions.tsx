import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api';

interface UserProfile {
  id: string;
  email: string;
  discordUsername: string;
  discordGlobalName: string;
  name: string | null;
  role: string;
}

interface CohortRecord {
  cohortId: string;
  cohortType: string;
  seasonNumber: number;
  weeklyScores: any[];
  totalScore: number;
  maxTotalScore: number;
}

interface ScoresResponse {
  cohorts: CohortRecord[];
}

interface WeekContent {
  week: number;
  title: string;
  content: string;
  questions: string[];
}

const MBInstructions: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccessToMB, setHasAccessToMB] = useState(false);
  const [activeWeek, setActiveWeek] = useState(1);
  const [weeklyContent, setWeeklyContent] = useState<WeekContent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const checkMasteringBitcoinAccess = useCallback(async () => {
    try {
      const scoresResponse = await apiClient.get<ScoresResponse>('/scores/me');
      console.log('Scores response:', scoresResponse.data);
      const joinedCohorts = scoresResponse.data.cohorts;


      const hasMasteringBitcoin = joinedCohorts.some(
        (record) => record.cohortType === 'MASTERING_BITCOIN'
      ); 

      setHasAccessToMB(hasMasteringBitcoin);

      if (!hasMasteringBitcoin) {
        setError('You need to be enrolled in a MASTERING_BITCOIN cohort to access these instructions.');
      }

    } catch (error) {
      console.error('Error checking cohort enrollment:', error);
      setError('Failed to verify cohort enrollment. Please try again.');
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await apiClient.get<UserProfile>('/users/me');
      setProfile(response.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load user profile.');
    }
  }, []);

  const loadInstructionContent = useCallback(async () => {
    try {
      // Placeholder content - will be replaced with actual MD file content
      const placeholderWeeks: WeekContent[] = [
        {
          week: 1,
          title: "Introduction to Bitcoin",
          content: "Welcome to Week 1 of Mastering Bitcoin. This week covers the fundamentals of Bitcoin and blockchain technology.",
          questions: [
            "What is Bitcoin and how does it differ from traditional currencies?",
            "Explain the concept of decentralization in Bitcoin.",
            "What role do miners play in the Bitcoin network?",
            "How does Bitcoin solve the double-spending problem?"
          ]
        },
        {
          week: 2,
          title: "Bitcoin Transactions",
          content: "This week focuses on how Bitcoin transactions work, including inputs, outputs, and digital signatures.",
          questions: [
            "What are transaction inputs and outputs?",
            "How do digital signatures work in Bitcoin?",
            "Explain the UTXO model.",
            "What is transaction malleability?"
          ]
        },
        {
          week: 3,
          title: "Bitcoin Scripting",
          content: "Learn about Bitcoin's scripting language and how it enables programmable money.",
          questions: [
            "What is Bitcoin Script?",
            "Explain Pay-to-Public-Key-Hash (P2PKH).",
            "How do multi-signature transactions work?",
            "What are some common script patterns?"
          ]
        },
        {
          week: 4,
          title: "The Bitcoin Network",
          content: "Understanding the peer-to-peer network that powers Bitcoin.",
          questions: [
            "How do Bitcoin nodes communicate?",
            "What is the role of full nodes vs. light clients?",
            "Explain the block propagation process.",
            "How does network partitioning affect Bitcoin?"
          ]
        },
        {
          week: 5,
          title: "Mining and Consensus",
          content: "Deep dive into Bitcoin mining, proof-of-work, and consensus mechanisms.",
          questions: [
            "How does proof-of-work secure the network?",
            "What is mining difficulty adjustment?",
            "Explain the longest chain rule.",
            "What are the economic incentives for miners?"
          ]
        },
        {
          week: 6,
          title: "Bitcoin Wallets and Keys",
          content: "Understanding Bitcoin wallets, key management, and security practices.",
          questions: [
            "What are the different types of Bitcoin wallets?",
            "How are Bitcoin addresses generated?",
            "Explain hierarchical deterministic (HD) wallets.",
            "What are the security considerations for key storage?"
          ]
        }
      ];

      setWeeklyContent(placeholderWeeks);
    } catch (error) {
      console.error('Error loading instruction content:', error);
      setError('Failed to load instruction content.');
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      try {
        await Promise.all([fetchProfile(), checkMasteringBitcoinAccess()]);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [fetchProfile, checkMasteringBitcoinAccess]);

  useEffect(() => {
    if (hasAccessToMB) {
      loadInstructionContent();
    }
  }, [hasAccessToMB, loadInstructionContent]);

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

  if (error || !hasAccessToMB) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-zinc-800/80 backdrop-blur-sm border border-zinc-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white">Access Restricted</h1>
              <p className="text-zinc-300 max-w-md mx-auto">
                {error || 'You need to be enrolled in a MASTERING_BITCOIN cohort to access these instructions.'}
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
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-orange-300 hover:text-orange-400 mb-6 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back</span>
          </button>

          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Mastering Bitcoin Instructions
          </h1>

          {profile && (
            <div className="bg-green-900/30 border border-green-700/50 rounded-xl p-4 mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <div>
                  <p className="text-green-300 font-semibold">
                    Welcome, {profile.name || profile.discordGlobalName}!
                  </p>
                  <p className="text-green-400/80 text-sm">
                    You have access to MASTERING_BITCOIN cohort instructions
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Week Tabs */}
        <div className="bg-zinc-800/80 backdrop-blur-sm border border-zinc-700/50 rounded-2xl shadow-2xl overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-zinc-700/50">
            <div className="flex overflow-x-auto scrollbar-hide">
              {weeklyContent.map((week) => (
                <button
                  key={week.week}
                  onClick={() => setActiveWeek(week.week)}
                  className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                    activeWeek === week.week
                      ? 'border-orange-500 text-orange-300 bg-zinc-700/50'
                      : 'border-transparent text-zinc-400 hover:text-zinc-300 hover:bg-zinc-700/30'
                  }`}
                >
                  Week {week.week}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6 sm:p-8">
            {weeklyContent.find(week => week.week === activeWeek) && (
              <div className="space-y-6">
                {/* Week Header */}
                <div className="border-b border-zinc-700/30 pb-4">
                  <h2 className="text-2xl font-bold text-orange-300 mb-2">
                    Week {activeWeek}: {weeklyContent.find(week => week.week === activeWeek)?.title}
                  </h2>
                  <p className="text-zinc-300 leading-relaxed">
                    {weeklyContent.find(week => week.week === activeWeek)?.content}
                  </p>
                </div>

                {/* Questions Section */}
                <div>
                  <h3 className="text-xl font-semibold text-orange-300 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Discussion Questions
                  </h3>
                  <div className="space-y-4">
                    {weeklyContent.find(week => week.week === activeWeek)?.questions.map((question, index) => (
                      <div key={index} className="bg-zinc-700/40 border border-zinc-600/50 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white text-sm font-semibold rounded-full flex items-center justify-center">
                            {index + 1}
                          </span>
                          <p className="text-zinc-200 leading-relaxed">{question}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-between items-center pt-6 border-t border-zinc-700/30">
                  <button
                    onClick={() => setActiveWeek(Math.max(1, activeWeek - 1))}
                    disabled={activeWeek === 1}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      activeWeek === 1
                        ? 'text-zinc-500 cursor-not-allowed'
                        : 'text-orange-300 hover:text-orange-400 hover:bg-zinc-700/30'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Previous Week</span>
                  </button>

                  <div className="text-zinc-400 text-sm">
                    Week {activeWeek} of {weeklyContent.length}
                  </div>

                  <button
                    onClick={() => setActiveWeek(Math.min(weeklyContent.length, activeWeek + 1))}
                    disabled={activeWeek === weeklyContent.length}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      activeWeek === weeklyContent.length
                        ? 'text-zinc-500 cursor-not-allowed'
                        : 'text-orange-300 hover:text-orange-400 hover:bg-zinc-700/30'
                    }`}
                  >
                    <span>Next Week</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MBInstructions;