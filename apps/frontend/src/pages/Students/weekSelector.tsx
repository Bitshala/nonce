import { useNavigate } from 'react-router-dom';

export default function WeekSelector() {
  const navigate = useNavigate();

  const weeks = [
    { number: 1, title: 'Finite Fields', description: 'Individual assignment' },
    { number: 2, title: 'Cryptography in Bitcoin', description: 'Individual assignment' },
    { number: 3, title: 'Serializations and Transactions', description: 'Individual assignment' },
    { number: 4, title: 'Scripts and Transaction Validation', description: 'Individual assignment' },
    { number: 5, title: 'P2SH scripts and Blocks', description: 'Individual assignment' },
    { number: 6, title: 'Networking and SPV', description: 'Individual assignment' }
  ];

  const handleWeekClick = (weekNumber: number) => {
    navigate(`/instructions/${weekNumber}`);
  };


  return (
    <div className="bg-zinc-800 font-mono h-screen flex justify-center items-center mx-auto">
      {/* Terminal Window */}
      <div className="w-[1000px] mx-auto bg-zinc-900 rounded-lg shadow-2xl border border-gray-600">
        {/* Terminal Window Header */}
        <div className="bg-zinc-700 rounded-t-lg px-4 py-3 flex items-center space-x-2">
          <div className="flex space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <div className="flex-1 text-center">
            <span className="text-gray-300 text-sm">Terminal — select_week.sh</span>
          </div>
        </div>

        {/* Terminal Content */}
        <div className="bg-zinc-900 text-orange-300 rounded-b-lg min-h-[600px]">
          {/* Terminal header */}
          <div className="bg-zinc-800 border-b border-orange-300 p-4">
            <div className="text-orange-300">
              <span className="text-orange-400"></span> select_week.sh
            </div>
            <div className="text-orange-200 mt-2">
              Select a week to view instructions for the week
            </div>
          </div>

          {/* Terminal content */}
          <div className="p-6">
            <div className="space-y-3">
              {weeks.map((week) => (
                <div 
                  key={week.number}
                  className="border border-orange-300 bg-zinc-800 hover:bg-zinc-700 cursor-pointer transition-colors duration-200 group"
                  onClick={() => handleWeekClick(week.number)}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span className="text-orange-400">[{week.number.toString().padStart(2, '0')}]</span>
                        <span className="text-orange-300 font-bold">Week {week.number}</span>
                      </div>
                      <span className="text-orange-200 group-hover:text-orange-300 transition-colors">
                        → {week.title}
                      </span>
                    </div>
                    <div className="mt-2 pl-8 text-orange-400 text-sm">
                      {week.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Terminal prompt at bottom */}
            <div className="mt-8 text-orange-400">
              <span className="text-orange-400"></span> 
              <span className="animate-pulse">█</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}