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
      const masteringBitcoinWeeks: WeekContent[] = [
        {
          week: 1,
          title: "Introduction & How Bitcoin Works",
          content: "Chapter 1: Introduction - Chapter 2: How Bitcoin Works",
          questions: [
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
          questions: [
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
          questions: [
            "Why does address reuse reduce privacy in Bitcoin? Can you think of other de-anonymizing missteps that might occur due to poor user experience design or lack of privacy education? What institutes perform the most address reuse?",
            "What is a Bitcoin wallet? What are the different types of wallets available?",
            "What is the difference between deterministic and non-deterministic wallets?",
            "Why does the author argue that BIP32 wallets are superior?",
            "What is a \"seed\" in the context of Bitcoin wallets? How are mnemonic words generated from the seed?",
            "What is the optional passphrase for a mnemonic code? Discuss its potential advantages and disadvantages.",
            "What are XPubs, XPrivs, and Chaincode?",
            "What are the components of an extended key? What is the fingerprint of a key?",
            "What are hardened and non-hardened derivations? Why is there a distinction, and what are the advantages of different kinds of derivations?",
            "Why is a brainwallet not secure, while mnemonic code words are?",
            "What are the different components of a Bitcoin transaction?",
            "What parts of the transaction structure got affected with the segwit upgrade? Were there any new fields added to the transaction structure?",
            "What is a coinbase transaction, how are they created, and why are they important?",
            "Compare a coinbase transaction to a normal bitcoin transaction and highlight the differences between the two.",
            "What are UTXOs (Unspent Transaction Outputs), and how is the balance of a wallet calculated?",
            "Explain transaction weight and virtual bytes? How are they calculated?",
            "What is witness marker and witness flag? How is it necessary?",
            "What is nSequence? What was it intented use when Satoshi created Bitcoin? How is it used today?",
            "What are various sources of transaction malleability? How does segwit fix transaction malleability?",
            "Can two transactions have the same transaction id? What happens to the UTXOs in those two transactions in that case?",
            "How is legacy serialization different from serialization after segwit upgrade? Highlight key differences.",
            "What are transaction inputs, and how are they constructed? What are unlocking scripts?"
          ]
        },
        {
          week: 4,
          title: "Authorization and Authentication & Digital Signature",
          content: "Chapter 7: Authorization and Authentication - Chapter 8: Digital Signature",
          questions: [
            "Is the Turing incompleteness of Bitcoin's scripting language (SCRIPT) a feature or a deficiency?",
            "What is the difference between a locking script (scriptPubKey) and an unlocking script (scriptSig)? What is the difference between a redeem script and a witness script?",
            "Why are the locking and unlocking scripts executed separately?",
            "Explain different types of timelocks which you can have and list the components of the transactions that can be used to set timelocks.",
            "What are the different ways to create contracts in the script? Briefly highlight pros and cons of each.",
            "Why is the public key directly included in a P2TR output whereas in other script types we always include a hash?",
            "Why is the Merkle path length limited to 128?",
            "How does Taproot upgrade increase security and privacy in Bitcoin?",
            "Highlight the differences between Tapscript and native Bitcoin script?",
            "What are sighashes, and what are their uses? How many types of sighashes are there?",
            "What are digital signatures, where are they placed in a transaction, and what is their purpose?",
            "Describe some real-life exploits that occurred due to poor randomness in digital signatures.",
            "Besides signing transactions, what other uses could digital signatures have?",
            "How does batch verification works in Schnorr signatures?",
            "What are the difference in serialisation of Schnorr signatures and ECDSA signatures?",
            "What is the quadratic sighash problem? How does segwit's new signing algorithm addresses it?",
            "What is the Discrete Log Problem, and why is it important in Cryptography? What does it mean when we say \"DLP is hard\"? What would have happened if DLP wasn't a \"hard\" problem?",
            "Why is it important to use a random number (k) as the basis for a private/public nonce pair? What vulnerabilities can be exploited if k is known to be reused? Can you provide a real-life example of when such an exploit occurred?",
            "How are ECDSA signature malleable? Does this malleability also occur in Schnorr signatures? Is there a way to fix this malleability?",
            "Explain the key difference between scriptless multisignature and scriptless threshhold signatures. Are they both possible in Bitcoin? If yes, then briefly discuss the different protocols for the same."
          ]
        },
        {
          week: 5,
          title: "Transaction Fees & The Bitcoin Network",
          content: "Chapter 9: Transaction Fees - Chapter 10: The Bitcoin Network",
          questions: [
            "Why do we need to pay transaction fees when we have block reward as an incentive? Is there a minimum fee that every transaction needs to pay? Is it a consensus rule or policy rule?",
            "What are the different fee estimation algorithms? Briefly discuss the internal workings of each.",
            "What are the RBF rules for fee-bumping a transaction? Which rules are important to protect against DoS attacks?",
            "What is transaction pinning? How is it a vulnerability for multiparty time-sensitive protocols such as LN?",
            "What is fee sniping and how does it work? How can it be prevented?",
            "Explain CPFP carve out and anchor outputs.",
            "What is a peer-to-peer network? Give two examples of successful peer-to-peer networks that preceded Bitcoin.",
            "What is a block finding race? How does compact block relay prevent it?",
            "How does a new node discover other Bitcoin nodes on the network in order to participate?",
            "How do light weight clients validate that a transaction exists? How is this different from the mechanism full archival nodes use to validate a transaction?",
            "What are bloom filters? How do they work?",
            "What are compact block filters? What data should be included in a block filter?",
            "What are the privacy trade-offs in using a light weight client?",
            "Explain in brief what is a Mempool and what is an Orphan Pool."
          ]
        },
        {
          week: 6,
          title: "The Blockchain & Mining and Consensus",
          content: "Chapter 11: The Blockchain - Chapter 12: Mining and Consensus",
          questions: [
            "How is the Bitcoin blockchain analogous to layers in a geological formation?",
            "Describe the structure of a block and what data does a block header contain?",
            "What are the two identifiers of a Block? Discuss each in brief.",
            "What is a Merkle Tree and what significance does it have in the Blockchain?",
            "What is a design flaw in the Merkle Tree used in Bitcoin?",
            "What is a Light Client in context to Bitcoin? How do Light Clients verify transactions associated to their addresses?",
            "Explain mainnet and testnet in brief. Can testned coins have value?",
            "Explain signet and regtest in brief. When would you use regtest for testing, and when Signet?",
            "What are the goals of Bitcoin mining and what are the incentives for the miners?",
            "Explain in brief how does the Bitcoin network attain emergent decentralised consensus.",
            "What is a coin-base transaction? What prevents the miners from inflating the coin-base reward?",
            "What is Mining Difficulty? Why and how is it adjusted?",
            "Explain the 51% attack. Can it compromise the security of private keys and signing algorithms?",
            "What factors could cause a change in Bitcoin's consensus rules? How is a change in consensus rules achieved in a decentralised network like Bitcoin?",
            "Define a Hard fork and explain whether a new software implementation of the consensus rules is a pre-requisite for it.",
            "Explain a soft fork. What are some common criticisms of a soft fork?"
          ]
        },
        {
          week: 7,
          title: "Bitcoin Security & Second-Layer Applications",
          content: "Chapter 13: Bitcoin Security - Chapter 14: Second-Layer Applications",
          questions: [
            "Why does the author say securing bitcoins is like securing cash or a chunk of precious metal?",
            "What could be the consequences of applying centralised security models to a decentralised network like Bitcoin?",
            "Explain the concept of root of trust in security models. What should be the root of trust for Bitcoin applications?",
            "How is physical storage of Bitcoin keys one of the most effective methods of securing bitcoins?",
            "How do hardware signing devices secure bitcoins?",
            "What could be the consequences of using unnecessarily complex techniques to secure bitcoins?",
            "What is the importance of using diverse storing mechanisms for bitcoin?",
            "What is a multi-sig address? In what situation is it advisable to share confidential information about your bitcoin keys with a trusted person?",
            "Mention and explain three primitives that Bitcoin guarantees for applications built on top of it.",
            "Explain at least two use-cases of applications build on top of Bitcoin.",
            "What are payment channels in context to Bitcoin? How do they facilitate extremely high transaction throughput?",
            "Explain what are funding and commitment transactions in context of payment channels.",
            "What is a uni-directional payment channel? Give an example.",
            "What is a bi-directional payment channel? Give an example.",
            "Can a Bitcoin transaction be cancelled? Explain asymmetric revocable transactions.",
            "What is a HTLC? Which OP-code is used to achieve it in context to payment channels?"
          ]
        }
      ];

      setWeeklyContent(masteringBitcoinWeeks);
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