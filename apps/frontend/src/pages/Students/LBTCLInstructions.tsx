import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../hooks/userHooks';
import { useMyScores } from '../../hooks/scoreHooks';
import { UserRole } from '../../types/enums';

interface WeekContent {
  week: number;
  title: string;
  content: string;
  gdQuestions: string[];
  bonusQuestions?: string[];
}

const LBTCLInstructions: React.FC = () => {
  const navigate = useNavigate();
  const [activeWeek, setActiveWeek] = useState(1);
  const [weeklyContent, setWeeklyContent] = useState<WeekContent[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Use hooks for data fetching
  const { data: userData, isLoading: isLoadingUser } = useUser();
  const { data: scoresData, isLoading: isLoadingScores } = useMyScores();

  // Check if user is TA or Admin
  const isAdminOrTA = userData?.role === UserRole.ADMIN || userData?.role === UserRole.TEACHING_ASSISTANT;

  // Derive hasAccessToLBTCL from scoresData or admin/TA role
  const hasAccessToLBTCL = isAdminOrTA || (scoresData?.cohorts.some(
    (record) => record.cohortType === 'LEARNING_BITCOIN_FROM_COMMAND_LINE'
  ) ?? false);

  // Admins and TAs can view bonus questions
  const canViewBonusQuestions = isAdminOrTA;

  const isLoading = isLoadingUser || isLoadingScores;

  const loadInstructionContent = useCallback(async () => {
    try {
      const learningBitcoinWeeks: WeekContent[] = [
        {
          week: 1,
          title: "Bitcoin Fundamentals & Cryptographic Primitives",
          content: "Introduction to Bitcoin's cryptographic foundations, blockchain structure, and node operations",
          gdQuestions: [
            "What are the cryptographic primitives used in Bitcoin? Give a brief description of each.",
            "What is a blockchain? How does it differ from an array or other common data structures in programming, and in what situations is a blockchain especially useful?",
            "Why does Bitcoin use elliptic-curve cryptography? Which specific curve does it rely on, and what are some alternative curves?",
            "What is a digital signature? Why is it recommended to verify the signature of a downloaded Bitcoin Core binary, and what kinds of attacks are possible with a malicious binary?",
            "Why is it important to run your own Bitcoin node?",
            "What are the differences among Bitcoin's network types—mainnet, testnet, signet, and regtest?",
            "What data is stored in the **blocks** and **chainstate** folders within the Bitcoin data directory?",
            "Which address formats exist in Bitcoin, and what defines a *legacy* address?",
            "What is a SegWit address, and why is it generally preferred over a legacy address?",
            "What is a Bitcoin faucet, and why are faucets provided only for testnet and signet? How can coins be obtained in regtest?",
            "What is a transaction ID (txid)? Which `bitcoin-cli` commands accept a txid as input, and why are txids useful?",
            "What is a *descriptor* in Bitcoin, and what problems does it solve?"
          ],
          bonusQuestions: [
            "What is a hash function? Why are hash functions essential in Bitcoin, and can two different inputs ever produce the same hash output?",
            "What is a 51% attack, and can a miner use 51% of the network hashrate to double-spend UTXOs?",
            "What is a natural blockchain reorganization (reorg), why does it occur, and how do nodes resolve it?",
            "What is RPC? Why does Bitcoin primarily use RPC rather than REST, and when is the REST API appropriate?",
            "What is the UTXO model, and what benefits does it provide compared with an account-based model?"
          ]
        },
        {
          week: 2,
          title: "Transactions, Fees & Advanced Transaction Mechanics",
          content: "Deep dive into Bitcoin transactions, fee mechanisms, UTXOs, and transaction lifecycle management",
          gdQuestions: [
            "What are the components of a transaction? Describe in brief each component and the data they contain.",
            "What is the transaction fee? Why do transactions need to pay fee? How to determine a suitable fee at the time of transaction creation?",
            "What is an unspent transaction output (UTXO)? How does `bitcoind` select UTXOs in case of `sendtoaddress` call?",
            "What does the confirmation of a transaction indicate? Why should we wait for a certain confirmation number on a transaction before spending them?",
            "What is a change address? What happens if we don't put the change address in `createrawtransaction` call?",
            "What is the difference between `createrawtransaction` and `fundrawtransaction` call? When to use one over the other?",
            "What is the difference between a segwit and a normal transaction?",
            "What is sequence number? What are the different ways it can be used to lock transactions?",
            "What is RBF? What is it useful for?",
            "What is CPFP? When to use it instead of RBF? Does RBF change `txid`? If so, why?",
            "What are some practical use cases of CPFP (hint: Lightning anchor outputs in channel opening transactions)",
            "What happens when a transaction being bumped by CPFP also gets fee bumped by RBF at the same time? What happens to the child transaction?"
          ],
          bonusQuestions: [
            "What is the UTXO model? What are the benefits over the Account based model?",
            "What is the minimum amount you can send with bitcoin-cli? Why this minimum limit exists? Can there be transactions violating this limit?",
            "How transactions can be lost from mempool? How to detect such situation? What can be done in that situation?"
          ]
        },
        {
          week: 3,
          title: "Multisig, PSBT & Hardware Wallet Integration",
          content: "Understanding multisignature transactions, Partially Signed Bitcoin Transactions, and hardware wallet workflows",
          gdQuestions: [
            "What is a multisig? What are the common script types for multisig addresses?",
            "Why is it important to preserve the order of keys in multisig addresses for address generation? What happens if the order isn't preserved?",
            "What is BIP67 lexicographical ordering?",
            "Does the order of signature matter for signing multisig?",
            "Explain the use of `addmultisigaddress` command. When is it useful over vanilla multisig generation?",
            "What is a PSBT and why is it useful?",
            "What are the different components of PSBT? Can you explain each part and it's use in brief?",
            "What is HWI? What it is useful for?"
          ],
          bonusQuestions: [
            "How are multisig wallets can be safer than single sig wallets? Give some examples of practical applications of multisig.",
            "What is a bare multisig? Why are they not used? How can you broadcast a transaction with bare multisig?",
            "What is PSBTv2? How is it different from PSBTv0? And where did v1 go?"
          ]
        }
      ];

      setWeeklyContent(learningBitcoinWeeks);
    } catch (error) {
      console.error('Error loading instruction content:', error);
      setError('Failed to load instruction content.');
    }
  }, []);

  // Set error if user doesn't have access
  useEffect(() => {
    if (!isLoading && scoresData && !hasAccessToLBTCL) {
      setError('You need to be enrolled in a LEARNING_BITCOIN_FROM_COMMAND_LINE cohort to access these instructions.');
    }
  }, [isLoading, scoresData, hasAccessToLBTCL]);

  // Load instruction content when user has access
  useEffect(() => {
    if (hasAccessToLBTCL) {
      loadInstructionContent();
    }
  }, [hasAccessToLBTCL, loadInstructionContent]);

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

  if (error || !hasAccessToLBTCL) {
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
                {error || 'You need to be enrolled in a LEARNING_BITCOIN_FROM_COMMAND_LINE cohort to access these instructions.'}
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
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 px-4 py-6">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className='flex flex-row-reverse justify-between mx-auto mb-12 items-baseline'>
            <button
              onClick={() => navigate(-1)}
              className="h-[30px] flex items-center border-none bg-transparent space-x-2 text-orange-300 hover:text-orange-400 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>

            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Learning Bitcoin from the Command Line - Group Discussion Questions
            </h1>
          </div>
        </div>

        {/* Week Tabs */}
        <div className="bg-zinc-800/80 backdrop-blur-sm border border-zinc-700/50 rounded-2xl shadow-2xl overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-zinc-700/50">
            <div className="flex w-full">
              {weeklyContent.map((week) => (
                <button
                  key={week.week}
                  onClick={() => setActiveWeek(week.week)}
                  className={`flex-1 border-none px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
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

                {/* GD Questions Section */}
                <div>
                  <h3 className="text-xl font-semibold text-orange-300 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Group Round Questions
                  </h3>
                  <div className="space-y-3">
                    {weeklyContent.find(week => week.week === activeWeek)?.gdQuestions.map((question, index) => (
                      <div key={index} className="">
                        <div className="flex items-start space-x-2">
                          <span className="text-orange-400 font-medium mt-0.5">{index + 1}.</span>
                          <p className="text-zinc-200 leading-relaxed flex-1">{question}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bonus Questions Section - Only visible to TAs and Admins */}
                {canViewBonusQuestions && weeklyContent.find(week => week.week === activeWeek)?.bonusQuestions && (
                  <div className="mt-8">
                    <h3 className="text-xl font-semibold text-orange-300 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      Bonus Questions
                    </h3>
                    <div className="space-y-3">
                      {weeklyContent.find(week => week.week === activeWeek)?.bonusQuestions?.map((question, index) => (
                        <div key={index} className="">
                          <div className="flex items-start space-x-2">
                            <span className="text-orange-400 font-medium mt-0.5">{index + 1}.</span>
                            <p className="text-zinc-200 leading-relaxed flex-1">{question}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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

export default LBTCLInstructions;
