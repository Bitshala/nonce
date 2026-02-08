import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { WeekContent } from '../../types/instructions';

interface InstructionsLayoutProps {
  cohortName: string;
  cohortType: 'MASTERING_BITCOIN' | 'LEARNING_BITCOIN_FROM_COMMAND_LINE' | 'MASTERING_LIGHTNING_NETWORK';
  weeklyContent: WeekContent[];
  activeWeek: number | 'links' | 'exercises';
  setActiveWeek: (week: number | 'links' | 'exercises') => void;
  canViewBonusQuestions: boolean;
  seasonNumber?: number;
}

const InstructionsLayout: React.FC<InstructionsLayoutProps> = ({
  cohortName,
  cohortType,
  weeklyContent,
  activeWeek,
  setActiveWeek,
  canViewBonusQuestions,
  seasonNumber,
}) => {
  const navigate = useNavigate();

  // Resolve the assignment link for a given week based on the user's season
  const getAssignmentLink = (week: WeekContent): string | undefined => {
    if (!week.assignmentLinks) return undefined;
    if (seasonNumber && week.assignmentLinks[seasonNumber]) {
      return week.assignmentLinks[seasonNumber];
    }
    // Fallback to the latest season's link if season is unknown
    const seasons = Object.keys(week.assignmentLinks).map(Number);
    if (seasons.length === 0) return undefined;
    const latestSeason = Math.max(...seasons);
    return week.assignmentLinks[latestSeason];
  };

  const handleGeneralInstructionsClick = () => {
    navigate('/general-instructions');
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-80 bg-zinc-900 border-r border-zinc-700 min-h-screen p-8">
          <h1 className="text-3xl font-bold mb-12 text-orange-400">{cohortName}</h1>

          <div className="space-y-2">
            {/* General Instructions Button */}
            <button
              onClick={handleGeneralInstructionsClick}
              className="w-full text-left px-4 py-2 rounded border-none flex items-center transition-colors text-black hover:text-orange-400 hover:bg-zinc-800/50"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              General Instructions
            </button>

            {/* Links Tab */}
            <button
              onClick={() => setActiveWeek('links')}
              className={`w-full text-left px-4 py-2 rounded border-none flex items-center transition-colors ${
                activeWeek === 'links'
                  ? 'bg-zinc-800 text-orange-400'
                  : 'text-black hover:text-orange-400 hover:bg-zinc-800/50'
              }`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Links
            </button>

            {/* Exercises Tab - Only for Lightning Network */}
            {cohortType === 'MASTERING_LIGHTNING_NETWORK' && (
              <button
                onClick={() => setActiveWeek('exercises')}
                className={`w-full text-left px-4 py-2 rounded border-none flex items-center transition-colors ${
                  activeWeek === 'exercises'
                    ? 'bg-zinc-800 text-orange-400'
                    : 'text-black hover:text-orange-400 hover:bg-zinc-800/50'
                }`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Exercises
              </button>
            )}

            {weeklyContent.map((week) => (
              <button
                key={week.week}
                onClick={() => setActiveWeek(week.week)}
                className={`w-full text-left px-4 py-2 rounded border-none flex items-center transition-colors ${
                  activeWeek === week.week
                    ? 'bg-zinc-800 text-orange-400'
                    : 'text-black hover:text-orange-400 hover:bg-zinc-800/50'
                }`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Week {week.week}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-12">
          <div className="max-w-4xl">
            {activeWeek === 'exercises' ? (
              // Exercises Content
              <>
                <h2 className="text-3xl font-bold mb-8 text-orange-400">Lightning Network Exercises</h2>
                <div className="space-y-12">
                  {/* Exercise 1 */}
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6">
                    <h3 className="text-2xl font-bold mb-4 text-orange-400">Exercise 1: First Node Setup and Invoice Generation</h3>
                    {(() => {
                      const week1 = weeklyContent.find(w => w.week === 1);
                      const link = week1 ? getAssignmentLink(week1) : undefined;
                      if (!link) return null;
                      return (
                        <div className="mb-4">
                          <a href={link} target="_blank" rel="noopener noreferrer" className="no-underline text-blue-400 hover:underline flex items-center gap-2 text-lg">
                            Exercise 1 Assignment
                            <img src="/link-icon.svg" alt="Link" className="w-5 h-5" style={{ filter: 'invert(1)' }} />
                          </a>
                        </div>
                      );
                    })()}
                    <div className="mb-4">
                      <p className="text-zinc-300 mb-2"><strong className="text-zinc-100">Concepts:</strong> Node initialization, wallet funding, invoice creation</p>
                    </div>
                    <div className="mb-4">
                      <p className="text-zinc-100 font-semibold mb-2">Problem Statement:</p>
                      <p className="text-zinc-300">Set up and run your first C-Lightning (Core Lightning) node. Once the node is operational, fund it with some test Bitcoin (on regtest or testnet). Using the CLN RPC interface, create a Lightning invoice for 50,000 satoshis with a description "Coffee Payment" and a 1-hour expiry.</p>
                    </div>
                    <div>
                      <p className="text-zinc-100 font-semibold mb-2">Expected Output:</p>
                      <ul className="list-disc list-inside text-zinc-300 space-y-1 ml-4">
                        <li>A running Lightning node with a funded on-chain wallet</li>
                        <li>A valid Lightning invoice (BOLT11 format) that can be decoded to show the amount, description, and expiry time</li>
                        <li>Verification that the invoice was generated by your node</li>
                      </ul>
                    </div>
                  </div>

                  {/* Exercise 2 */}
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6">
                    <h3 className="text-2xl font-bold mb-4 text-orange-400">Exercise 2: Peer Connection and Channel Establishment</h3>
                    {(() => {
                      const week2 = weeklyContent.find(w => w.week === 2);
                      const link = week2 ? getAssignmentLink(week2) : undefined;
                      if (!link) return null;
                      return (
                        <div className="mb-4">
                          <a href={link} target="_blank" rel="noopener noreferrer" className="no-underline text-blue-400 hover:underline flex items-center gap-2 text-lg">
                            Exercise 2 Assignment
                            <img src="/link-icon.svg" alt="Link" className="w-5 h-5" style={{ filter: 'invert(1)' }} />
                          </a>
                        </div>
                      );
                    })()}
                    <div className="mb-4">
                      <p className="text-zinc-300 mb-2"><strong className="text-zinc-100">Concepts:</strong> Node discovery, peer connection, channel opening, channel capacity</p>
                    </div>
                    <div className="mb-4">
                      <p className="text-zinc-100 font-semibold mb-2">Problem Statement:</p>
                      <p className="text-zinc-300">Create and run two separate Lightning nodes (Alice and Bob). Connect them as peers using their respective node IDs and network addresses. Once connected, have Alice open a payment channel to Bob with a capacity of 500,000 satoshis. Verify that the channel is active and check the channel state on both nodes.</p>
                    </div>
                    <div>
                      <p className="text-zinc-100 font-semibold mb-2">Expected Output:</p>
                      <ul className="list-disc list-inside text-zinc-300 space-y-1 ml-4">
                        <li>Two running Lightning nodes that recognize each other as peers</li>
                        <li>An active payment channel between Alice and Bob</li>
                        <li>Channel details showing: capacity, local/remote balance, channel ID, and state (CHANNELD_NORMAL)</li>
                      </ul>
                    </div>
                  </div>

                  {/* Exercise 3 */}
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6">
                    <h3 className="text-2xl font-bold mb-4 text-orange-400">Exercise 3: Multi-Hop Payment Routing</h3>
                    {(() => {
                      const week3 = weeklyContent.find(w => w.week === 3);
                      const link = week3 ? getAssignmentLink(week3) : undefined;
                      if (!link) return null;
                      return (
                        <div className="mb-4">
                          <a href={link} target="_blank" rel="noopener noreferrer" className="no-underline text-blue-400 hover:underline flex items-center gap-2 text-lg">
                            Exercise 3 Assignment
                            <img src="/link-icon.svg" alt="Link" className="w-5 h-5" style={{ filter: 'invert(1)' }} />
                          </a>
                        </div>
                      );
                    })()}
                    <div className="mb-4">
                      <p className="text-zinc-300 mb-2"><strong className="text-zinc-100">Concepts:</strong> Network topology, pathfinding, multi-hop payments, routing fees</p>
                    </div>
                    <div className="mb-4">
                      <p className="text-zinc-100 font-semibold mb-2">Problem Statement:</p>
                      <p className="text-zinc-300">Building on Exercise 2, create a third node (Carol). Establish a network topology where: Alice has a channel with Bob (500k sats), and Bob has a channel with Carol (300k sats). Carol should generate an invoice for 100,000 satoshis. Alice should pay this invoice, which will require the payment to route through Bob as an intermediate hop. Monitor and verify that the payment successfully traverses the network.</p>
                    </div>
                    <div>
                      <p className="text-zinc-100 font-semibold mb-2">Expected Output:</p>
                      <ul className="list-disc list-inside text-zinc-300 space-y-1 ml-4">
                        <li>A 3-node network with appropriate channel topology (Alice→Bob→Carol)</li>
                        <li>Successful payment from Alice to Carol via Bob</li>
                        <li>Proof of payment (preimage) received by Alice</li>
                        <li>Updated channel balances reflecting the routed payment and routing fees collected by Bob</li>
                      </ul>
                    </div>
                  </div>

                  {/* Exercise 4 */}
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6">
                    <h3 className="text-2xl font-bold mb-4 text-orange-400">Exercise 4: Circular Rebalancing</h3>
                    {(() => {
                      const week4 = weeklyContent.find(w => w.week === 4);
                      const link = week4 ? getAssignmentLink(week4) : undefined;
                      if (!link) return null;
                      return (
                        <div className="mb-4">
                          <a href={link} target="_blank" rel="noopener noreferrer" className="no-underline text-blue-400 hover:underline flex items-center gap-2 text-lg">
                            Exercise 4 Assignment
                            <img src="/link-icon.svg" alt="Link" className="w-5 h-5" style={{ filter: 'invert(1)' }} />
                          </a>
                        </div>
                      );
                    })()}
                    <div className="mb-4">
                      <p className="text-zinc-300 mb-2"><strong className="text-zinc-100">Concepts:</strong> Channel liquidity, circular payments, channel balance management</p>
                    </div>
                    <div className="mb-4">
                      <p className="text-zinc-100 font-semibold mb-2">Problem Statement:</p>
                      <p className="text-zinc-300">Using your 3-node network from Exercise 3, create a circular topology by opening a new channel from Carol back to Alice with 400,000 satoshis capacity. Now you have: Alice→Bob, Bob→Carol, and Carol→Alice. Execute a circular rebalancing payment where Alice pays herself 150,000 satoshis by routing the payment through Bob and Carol (Alice→Bob→Carol→Alice). Verify that the payment completes successfully and observe how the balances shift in each channel.</p>
                    </div>
                    <div>
                      <p className="text-zinc-100 font-semibold mb-2">Expected Output:</p>
                      <ul className="list-disc list-inside text-zinc-300 space-y-1 ml-4">
                        <li>A circular network topology with three bidirectional channels (Alice↔Bob↔Carol↔Alice)</li>
                        <li>Successful self-payment from Alice to Alice via the circular route</li>
                        <li>Before and after channel balance snapshots for all three channels</li>
                        <li>Proof that liquidity has been redistributed: Alice's outbound capacity increased on the Alice→Bob channel, while her inbound capacity decreased on the Carol→Alice channel</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            ) : activeWeek === 'links' ? (
              // Links Content
              <>
                <h2 className="text-3xl font-bold mb-8 text-orange-400">Frequently Accessed Links</h2>
                <div className="flex flex-col space-y-6 text-lg">
                  <a
                    href="https://wheelofnames.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="no-underline text-white hover:underline flex items-center gap-2"
                  >
                    Wheel of Names
                                   <img
                      src="/link-icon.svg"
                      alt="Link"
                      className="w-5 h-5"
                      style={{ filter: 'invert(1)' }}
                    />
                  </a>

                  <a
                    href="https://www.multibuzz.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="no-underline text-white hover:underline flex items-center gap-2"
                  >
                    MultiBuzz
                                        <img
                      src="/link-icon.svg"
                      alt="Link"
                      className="w-5 h-5"
                      style={{ filter: 'invert(1)' }}
                    />
                  </a>

                  {/* Admin and TA only links - Cohort Specific */}
                  {canViewBonusQuestions && cohortType === 'LEARNING_BITCOIN_FROM_COMMAND_LINE' && (
                    <>
                      <a
                        href="https://docs.google.com/document/d/1YXsW3gRVbBxBEAAcI84W3KCFBbevzVXUUznH8w2XohM/preview"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="no-underline text-white hover:underline flex items-center gap-2"
                      >
                        lbtcl-playbook
                        <img
                          src="/link-icon.svg"
                          alt="Link"
                          className="w-5 h-5"
                          style={{ filter: 'invert(1)' }}
                        />
                      </a>

                      <a
                        href="https://gist.github.com/rajarshimaitra/f83eaf3295b88ac180a965b3daab4d8a"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="no-underline text-white hover:underline flex items-center gap-2"
                      >
                        lbtcl-bonus-questions
                        <img
                          src="/link-icon.svg"
                          alt="Link"
                          className="w-5 h-5"
                          style={{ filter: 'invert(1)' }}
                        />
                      </a>

                      <a
                        href="https://github.com/Bitshala/LBTCL"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="no-underline text-white hover:underline flex items-center gap-2"
                      >
                        lbtcl-main-repo
                        <img
                          src="/link-icon.svg"
                          alt="Link"
                          className="w-5 h-5"
                          style={{ filter: 'invert(1)' }}
                        />
                      </a>
                    </>
                  )}
                </div>
              </>
            ) : (
              // Questions Content
              <>
                {weeklyContent.find(week => week.week === activeWeek) && (
                  <div className="space-y-12">
                    <h2 className="text-3xl font-bold mb-6 text-orange-400">
                      {weeklyContent.find(week => week.week === activeWeek)?.title}
                    </h2>

                    {/* Assignment Link Section */}
                    {(() => {
                      const currentWeek = weeklyContent.find(week => week.week === activeWeek);
                      const assignmentLink = currentWeek ? getAssignmentLink(currentWeek) : undefined;
                      if (!assignmentLink) return null;
                      return (
                        <div>
                          <h3 className="text-2xl font-bold mb-6 text-blue-400">Assignment</h3>
                          <div className="flex flex-col space-y-6 text-lg">
                            <a
                              href={assignmentLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="no-underline text-white hover:underline flex items-center gap-2"
                            >
                              Week {activeWeek} Assignment
                              <img
                                src="/link-icon.svg"
                                alt="Link"
                                className="w-5 h-5"
                                style={{ filter: 'invert(1)' }}
                              />
                            </a>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Reading Material Section - Before Questions */}
                    {weeklyContent.find(week => week.week === activeWeek)?.content && (() => {
                      const content = weeklyContent.find(week => week.week === activeWeek)?.content || '';
                      const sections = content.split('## ').filter(s => s.trim());
                      const readingMaterialSection = sections.find(section => section.trim().startsWith('Reading Material'));

                      if (readingMaterialSection) {
                        const lines = readingMaterialSection.split('\n');
                        const sectionContent = lines.slice(1).join('\n');

                        return (
                          <div>
                            <h3 className="text-2xl font-bold mb-6 text-blue-400">Reading Material</h3>
                            <div className="flex flex-col space-y-6 text-lg">
                              {sectionContent
                                .split('\n')
                                .filter(line => line.match(/\[([^\]]+)\]\(([^)]+)\)/))
                                .map((line, index) => {
                                  const match = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
                                  if (match) {
                                    return (
                                      <a
                                        key={index}
                                        href={match[2]}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="no-underline text-white hover:underline flex items-center gap-2"
                                      >
                                        {match[1]}
                                        <img
                                          src="/link-icon.svg"
                                          alt="Link"
                                          className="w-5 h-5"
                                          style={{ filter: 'invert(1)' }}
                                        />
                                      </a>
                                    );
                                  }
                                  return null;
                                })}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    <h2 className="text-3xl font-bold mb-8 text-orange-400">List of Questions</h2>

                    {/* Group Round */}
                    <div>
                      <h3 className="text-2xl font-bold mb-6 text-zinc-100">Group Round</h3>
                      <ol className="space-y-4 list-none">
                        {weeklyContent.find(week => week.week === activeWeek)?.gdQuestions.map((question, index) => (
                          <li key={index} className="flex items-start text-zinc-200 leading-relaxed text-lg">
                            <span className="text-orange-400 mr-3 mt-1 font-semibold">{index + 1}.</span>
                            <span>{question}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Bonus Round - Only visible to TAs and Admins */}
                    {canViewBonusQuestions && weeklyContent.find(week => week.week === activeWeek)?.bonusQuestions && (
                      <div>
                        <h3 className="text-2xl font-bold mb-6 text-zinc-100">Bonus Round</h3>
                        <ol className="space-y-4 list-none">
                          {weeklyContent.find(week => week.week === activeWeek)?.bonusQuestions?.map((question, index) => (
                            <li key={index} className="flex items-start text-zinc-200 leading-relaxed text-lg">
                              <span className="text-blue-400 mr-3 mt-1 font-semibold">{index + 1}.</span>
                              <span>{question}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Activity Section - Below Questions */}
                    {weeklyContent.find(week => week.week === activeWeek)?.content && (() => {
                      const content = weeklyContent.find(week => week.week === activeWeek)?.content || '';
                      const sections = content.split('## ').filter(s => s.trim());
                      const activitySection = sections.find(section => section.trim().startsWith('Activity'));

                      if (activitySection) {
                        const lines = activitySection.split('\n');
                        const sectionContent = lines.slice(1).join('\n');

                        return (
                          <div>
                            <h3 className="text-2xl font-bold mb-6 text-blue-400">Activity</h3>
                            <div className="text-zinc-200 text-lg leading-relaxed">
                              {sectionContent.trim()}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructionsLayout;
