import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { WeekContent } from '../../types/instructions';

interface InstructionsLayoutProps {
  cohortName: string;
  cohortType: 'MASTERING_BITCOIN' | 'LEARNING_BITCOIN_FROM_COMMAND_LINE';
  weeklyContent: WeekContent[];
  activeWeek: number | 'links';
  setActiveWeek: (week: number | 'links') => void;
  canViewBonusQuestions: boolean;
}

const InstructionsLayout: React.FC<InstructionsLayoutProps> = ({
  cohortName,
  cohortType,
  weeklyContent,
  activeWeek,
  setActiveWeek,
  canViewBonusQuestions,
}) => {
  const navigate = useNavigate();

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
              className="w-full text-left px-4 py-2 rounded border-none flex items-center transition-colors text-zinc-400 hover:text-orange-400 hover:bg-zinc-800/50"
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
                  : 'text-zinc-400 hover:text-orange-400 hover:bg-zinc-800/50'
              }`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Links
            </button>

            {weeklyContent.map((week) => (
              <button
                key={week.week}
                onClick={() => setActiveWeek(week.week)}
                className={`w-full text-left px-4 py-2 rounded border-none flex items-center transition-colors ${
                  activeWeek === week.week
                    ? 'bg-zinc-800 text-orange-400'
                    : 'text-zinc-400 hover:text-orange-400 hover:bg-zinc-800/50'
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
            {activeWeek === 'links' ? (
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
                <h2 className="text-3xl font-bold mb-8 text-orange-400">List of Questions</h2>

                {weeklyContent.find(week => week.week === activeWeek) && (
                  <div className="space-y-12">
                    {/* Group Round */}
                    <div>
                      <h3 className="text-2xl font-bold mb-6 text-zinc-100">Group Round</h3>
                      <ul className="space-y-4">
                        {weeklyContent.find(week => week.week === activeWeek)?.gdQuestions.map((question, index) => (
                          <li key={index} className="flex items-start text-zinc-200 leading-relaxed text-lg">
                            <span className="text-orange-400 mr-3 mt-1">•</span>
                            <span>{question}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Bonus Round - Only visible to TAs and Admins */}
                    {canViewBonusQuestions && weeklyContent.find(week => week.week === activeWeek)?.bonusQuestions && (
                      <div>
                        <h3 className="text-2xl font-bold mb-6 text-zinc-100">Bonus Round</h3>
                        <ul className="space-y-4">
                          {weeklyContent.find(week => week.week === activeWeek)?.bonusQuestions?.map((question, index) => (
                            <li key={index} className="flex items-start text-zinc-200 leading-relaxed text-lg">
                              <span className="text-blue-400 mr-3 mt-1">•</span>
                              <span>{question}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
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
