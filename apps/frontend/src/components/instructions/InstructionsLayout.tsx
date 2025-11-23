import React from 'react';
import type { WeekContent } from '../../types/instructions';

interface InstructionsLayoutProps {
  cohortName: string;
  weeklyContent: WeekContent[];
  activeWeek: number;
  setActiveWeek: (week: number) => void;
  canViewBonusQuestions: boolean;
}

const InstructionsLayout: React.FC<InstructionsLayoutProps> = ({
  cohortName,
  weeklyContent,
  activeWeek,
  setActiveWeek,
  canViewBonusQuestions,
}) => {
  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-80 bg-zinc-900 border-r border-zinc-700 min-h-screen p-8">
          <h1 className="text-3xl font-bold mb-12">{cohortName}</h1>

          <div className="space-y-2">
            {weeklyContent.map((week) => (
              <button
                key={week.week}
                onClick={() => setActiveWeek(week.week)}
                className={`w-full text-left px-4 py-2 rounded border-none flex items-center transition-colors ${
                  activeWeek === week.week
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
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
          <div className="max-w-5xl">
            <h2 className="text-3xl font-bold mb-8">List of Questions</h2>

            {weeklyContent.find(week => week.week === activeWeek) && (
              <div className="space-y-8">
                {/* Group Round */}
                <div>
                  <h3 className="text-2xl font-bold mb-6">Group Round</h3>
                  <ul className="space-y-4 list-disc pl-6">
                    {weeklyContent.find(week => week.week === activeWeek)?.gdQuestions.map((question, index) => (
                      <li key={index} className="text-zinc-200 leading-relaxed">
                        {question}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Bonus Round - Only visible to TAs and Admins */}
                {canViewBonusQuestions && weeklyContent.find(week => week.week === activeWeek)?.bonusQuestions && (
                  <div>
                    <h3 className="text-2xl font-bold mb-6">Bonus Round</h3>
                    <ul className="space-y-4 list-disc pl-6">
                      {weeklyContent.find(week => week.week === activeWeek)?.bonusQuestions?.map((question, index) => (
                        <li key={index} className="text-zinc-200 leading-relaxed">
                          {question}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructionsLayout;
