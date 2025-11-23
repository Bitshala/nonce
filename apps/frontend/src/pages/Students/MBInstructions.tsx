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

const MBInstructions: React.FC = () => {
  const navigate = useNavigate();
  const [activeWeek, setActiveWeek] = useState(1);
  const [weeklyContent, setWeeklyContent] = useState<WeekContent[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Use hooks for data fetching
  const { data: userData, isLoading: isLoadingUser } = useUser();
  const { data: scoresData, isLoading: isLoadingScores } = useMyScores();

  // Check if user is TA or Admin
  const isAdminOrTA = userData?.role === UserRole.ADMIN || userData?.role === UserRole.TEACHING_ASSISTANT;

  // Derive hasAccessToMB from scoresData or admin/TA role
  const hasAccessToMB = isAdminOrTA || (scoresData?.cohorts.some(
    (record) => record.cohortType === 'MASTERING_BITCOIN'
  ) ?? false);

  // Admins and TAs can view bonus questions
  const canViewBonusQuestions = isAdminOrTA;

  const isLoading = isLoadingUser || isLoadingScores;

  const loadInstructionContent = useCallback(async () => {
    try {
      const masteringBitcoinWeeks: WeekContent[] = [
        {
          week: 1,
          title: "Introduction & How Bitcoin Works",
          content: "Chapter 1: Introduction - Chapter 2: How Bitcoin Works",
          gdQuestions: [
            "What were the major problems of Digital Currencies before Bitcoin? How did Bitcoin solve them?",
            "What are the major components of the Bitcoin System? What does it mean by \"consensus rules\"?",
            "What are the different types of Bitcoin Wallets? Which one among them is most and least secured?",
            "What are the different types of Bitcoin Nodes? What are the tradeoffs between them? When is it applicable to use a \"light node\"?",
            "Do you think it would be better if bitcoin transactions were reversible? What are the potential benefits and drawbacks?",
            "Do you believe Bitcoin needs to compete with Visa/MasterCard to succeed? Why or why not?",
            "What is the Bitcoin Issuance Rate? How do we know the supply cap of Bitcoin is 21 million?",
            "Is Bitcoin private? Does Bitcoin need to be private? Why isn't Bitcoin fungible?",
            "What is transaction fee? How is it calculated? Whats the effect of transaction fee on transaction confirmation?",
            "What are the two main components of a Transaction? What does each component include?",
            "What are change addresses? When are change addresses required? What happens if the user (or wallet sofwtware) forgets to include the change address in a transaction? When will we not require a change address?",
            "What does coinselection mean? Can you name few popular coinselection algorithms? Is it better to manually select coins or let the wallet software automatically handle it?",
            "How is Proof of Work mining similar to \"needle in haystack\" problem? What happens when two blocks are mined by different miners at the same height, how does the network decide which is the \"right\" block?",
            "What does it mean by a transaction to be \"confirmed\"? How many confirmation is usually acceptable? Is it okay to accept unconfirmed transactions? Why or why not?",
            "What is the lowest denomination of Bitcoin? Can we run out of decimals to denominate the smallest unit, as Bitcoin adoption increases?",
            "Why did Satoshi said transactions are \"chain of digital signatures\"? What is a UTXO? Whats the difference between UTXO and Account based model? Why did Bitcoin choose to stick with UTXO model?"
          ]
        },
        {
          week: 2,
          title: "Bitcoin Core & Keys and Addresses",
          content: "Chapter 3: Bitcoin Core - Chapter 4: Keys and Addresses",
          gdQuestions: [
            "Why is Bitcoin Core called a \"Reference Implementation\"? What other implementations of Bitcoin are out there? Is it preferable to have many implementations of Bitcoin?",
            "What are BIPs (Bitcoin Improvement Proposals)? What are their role in the Bitcoin development process?",
            "What are the few major configuration options in Bitcoin Core? As a home node operator, which one do you think is most useful?",
            "What is `txindex`? When would a node operator use this configuration flag? What are the overheads of turning this configuration on?",
            "What is `bitcoin-cli`? What is it used for? Have you explored any `bitcoin-cli` commands? Which commands do you find most useful as a home node operator?",
            "What is the approximate disk space requirement for running Bitcoin Core? What are the approximate network bandwidth and memory requirements? Do you think it's \"cheap\" to run a node?",
            "What are commands you would use sequentially to get the fully deserialized coinbase transaction of the Block 100, using `bitcoin-cli`?",
            "How can you verify the signatures of download binaries of Bitcoin Core? What are the potential damages of running a malicious version of the software?",
            "Describe the functions of 'private keys', 'public keys', 'Bitcoin addresses', and 'digital signatures'. What is the mathematical relationship between them and how are they used in Bitcoin?",
            "What is the discrete logarithm problem, and why is it considered hard to solve?",
            "What is asymmetry in cryptography, and why are one-way functions useful? Identify a one-way cryptographic function used in deriving public keys from private keys.",
            "Describe instances where private keys have been compromised due to lack of entropy. Why is it important to use a cryptographically secure pseudorandom number generator to produce a private key? What are some techniques of generating pseudo random numbers?",
            "What is secp256k1, and what are the curve constants used in Bitcoin? How is ECDSA malleable?",
            "What is a Bitcoin address, and why are addresses used instead of raw public keys?",
            "What hash functions are used in the generation of Bitcoin addresses?",
            "Why is Base58 used for Bitcoin addresses instead of Base64? Would you make any modifications beyond Base58?",
            "What are the different private key formats used by wallets?",
            "What are compressed public keys, and what are the benefits of compressing a public key?",
            "What are the different kinds of Bitcoin addresses? Explain the differences between P2PKH and P2SH.",
            "What is the difference between a hot wallet and cold storage?",
            "What is bech32? How is it better than base58? Are there any problems in bech32? How are they solved?"
          ]
        },
        {
          week: 3,
          title: "Wallet Recovery & Transactions",
          content: "Chapter 5: Wallet Recovery - Chapter 6: Transactions",
          gdQuestions: [
            "What is a Bitcoin wallet? What are the different types of wallets available?",
            "What is the difference between deterministic and non-deterministic wallets?",
            "What is a \"seed\" in the context of Bitcoin wallets? How are mnemonic words generated from the seed?",
            "What is the optional passphrase for a mnemonic? In which situations passphrase can be useful?",
            "What are the components of an extended key (XPub)? What is the fingerprint of a key?",
            "What are hardened and non-hardened derivations? What are the advantages of having different types of derivations?",
            "What are the different components of a Bitcoin transaction? What are transaction inputs and outputs, and how are they constructed? What are locking and unlocking scripts?",
            "What are various sources of transaction malleability? How does segwit fix transaction malleability? What parts of the transaction structure got affected with the segwit upgrade?"
          ],
          bonusQuestions: [
            "What is nSequence? What was it intended use when Satoshi created Bitcoin? How is it used today?",
            "What are various sources of transaction malleability? How does segwit fix transaction malleability?",
            "Can two transactions have the same transaction id? When can this happen? Is that a consensus violation?"
          ]
        },
        {
          week: 4,
          title: "Authorization and Authentication & Digital Signature",
          content: "Chapter 7: Authorization and Authentication - Chapter 8: Digital Signature",
          gdQuestions: [
            "Is the Turing incompleteness of Bitcoin's scripting language (SCRIPT) a feature or a deficiency?",
            "Explain different types of timelocks available in a Bitcoin transaction and list the components of the transactions that can be used to set these timelocks.",
            "How does Taproot upgrade increase security and privacy in Bitcoin?",
            "Highlight the differences between Tapscript and native Bitcoin script?",
            "What are digital signatures, where are they placed in a transaction, and what is their purpose?",
            "What are sighashes, and what are their uses? How many types of sighashes are there?",
            "What is the Discrete Log Problem, and why is it important in Cryptography? What does it mean when we say \"DLP is hard\"? What would have happened if DLP wasn't a \"hard\" problem?",
            "Why is it important to use a random number (k) as the basis for a private/public nonce pair? What vulnerabilities can be exploited if k is known to be reused? Can you provide a real-life example of when such an exploit occurred?"
          ],
          bonusQuestions: [
            "Why is the public key directly included in a P2TR output whereas in other script types we always include a hash?",
            "Why are the locking and unlocking scripts executed separately?",
            "Besides signing transactions, what other uses could digital signatures have?"
          ]
        },
        {
          week: 5,
          title: "Transaction Fees & The Bitcoin Network",
          content: "Chapter 9: Transaction Fees - Chapter 10: The Bitcoin Network",
          gdQuestions: [
            "Why do we need to pay transaction fees when we have block reward as an incentive? Is there a minimum fee that every transaction needs to pay? Is it a consensus rule or policy rule?",
            "What is RBF. When is it useful? List all the conditions required to do a valid RBF.",
            "What is CPFP (Child Pays For Parents)? When is it useful? In which situation RBF cannot be used, but CPFP can be used?",
            "What is transaction pinning? How is it a vulnerability for multiparty time-sensitive protocols such as LN?",
            "What is a peer-to-peer network? Give two examples of successful peer-to-peer networks that preceded Bitcoin.",
            "Explain in brief what is a Mempool and what is an Orphan Pool.",
            "How do light clients validate that a transaction exists? How is this different from the mechanism full archival nodes use to validate a transaction?",
            "What are compact block filters? What data should be included in a block filter?"
          ],
          bonusQuestions: [
            "What are the privacy trade-offs in using a light client?",
            "What is fee sniping and how does it work? How can it be prevented?",
            "What is CPFP carve out and anchor outputs?"
          ]
        },
        {
          week: 6,
          title: "The Blockchain & Mining and Consensus",
          content: "Chapter 11: The Blockchain - Chapter 12: Mining and Consensus",
          gdQuestions: [
            "Describe the structure of a block and what data does a block header contain?",
            "What is a Merkle Tree? How is it used in the blockchain? What data does the Merkle Root verifies?",
            "What is the difference between mainnet and testnet? Can testnet coins have value?",
            "What is the difference between signet and testnet? What is regtest? When is it useful?",
            "What is a coinbase transaction? What prevents the miners from inflating the coinbase reward?",
            "Explain the 51% attack. Can it compromise the security of private keys and signing algorithms?",
            "What is Mining Difficulty? How is it adjusted? What would happen if it wasn't adjusted?",
            "What is the difference between Hard Fork and Soft Fork? Is it possible to do hard fork of Bitcoin, without creating a new coin/network, at current stage of the market?"
          ],
          bonusQuestions: [
            "How are soft forks are activated in Bitcoin? What was the last soft fork that happened?",
            "What is \"Rough Consensus\"? How does it affect Bitcoin's development?",
            "When was the last Bitcoin hardfork? What caused it?"
          ]
        },
        {
          week: 7,
          title: "Bitcoin Security & Second-Layer Applications",
          content: "Chapter 13: Bitcoin Security - Chapter 14: Second-Layer Applications",
          gdQuestions: [
            "Why does the author say securing bitcoins is like securing cash or a chunk of precious metal?",
            "What could be the consequences of applying centralised security models to a decentralised network like Bitcoin?",
            "Explain the concept of root of trust in security models. What should be the root of trust for Bitcoin applications?",
            "Why are hardware siging devices the most recommended way of storing Bitcoin?",
            "What are payment channels in context to Bitcoin? How do they facilitate extremely high transaction throughput?",
            "Can a Bitcoin transaction be cancelled? Explain asymmetric revocable transactions.",
            "What is a HTLC? Which OP-code is used to achieve it in context to payment channels?",
            "Explain what are funding and commitment transactions in context of payment channels."
          ],
          bonusQuestions: [
            "What could be the consequences of using unnecessarily complex techniques to secure bitcoins?",
            "Explain at least two use-cases of applications build on top of Bitcoin.",
            "Can a Bitcoin transaction be cancelled? Explain asymmetric revocable transactions."
          ]
        }
      ];

      setWeeklyContent(masteringBitcoinWeeks);
    } catch (error) {
      console.error('Error loading instruction content:', error);
      setError('Failed to load instruction content.');
    }
  }, []);

  // Set error if user doesn't have access
  useEffect(() => {
    if (!isLoading && scoresData && !hasAccessToMB) {
      setError('You need to be enrolled in a MASTERING_BITCOIN cohort to access these instructions.');
    }
  }, [isLoading, scoresData, hasAccessToMB]);

  // Load instruction content when user has access
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
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 px-4 py-6">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className='flex flex-row-reverse justify-between mx-auto mb-12 items-baseline'>
            <button
              onClick={() => navigate(-1)}
              className="h-[30px] flex items-center border-none bg-transparent space-x-2 text-orange-300 hover:text-orange-400  transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>

            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Mastering Bitcoin Group Discussion Questions
            </h1>
          </div>


        </div>

        {/* Week Tabs */}
        <div className=" bg-zinc-800/80 backdrop-blur-sm border border-zinc-700/50 rounded-2xl shadow-2xl overflow-hidden">
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
                    GD Questions
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

export default MBInstructions;