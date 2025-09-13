import { TrendingUp } from 'lucide-react';
import type { WeeklyData } from '../../types/student';

interface WeeklyProgressChartProps {
  weeklyData: WeeklyData[];
}

export const WeeklyProgressChart = ({ weeklyData }: WeeklyProgressChartProps) => {
  return (
    <div className="bg-zinc-900 border border-orange-300 p-6 mb-8 font-mono">
      <h2 className="text-lg font-semibold text-orange-300 mb-4 flex items-center border-b border-orange-300 pb-2">
        <TrendingUp className="h-5 w-5 mr-2 text-orange-400" />
        <span className="text-orange-400"></span>
        <span className="ml-2">Weekly Progress</span>
      </h2>
      
      <div className="space-y-3">
        {weeklyData.map((week) => (
          <div key={week.week} className="flex items-center space-x-4">
            <div className="w-16 text-sm font-medium text-orange-300">
              <span className="text-orange-400">[{week.week.toString().padStart(2, '0')}]</span>
            </div>
            
            <div className="flex-1 bg-zinc-700 border border-orange-400 h-6 relative">
              <div 
                className="h-6 text-white bg-orange-400 transition-all duration-300"
                style={{ width: `${Math.min((week.total ) * 100, 100)}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-md font-medium text-orange-300 text-white ">
                  {week.total}
                </span>
              </div>
            </div>
            
            <div className={`w-20 text-sm font-medium text-right ${
              week.attendance ? 'text-orange-300' : 'text-orange-200'
            }`}>
              {week.attendance ? '✓ Present' : '✗ Absent'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};