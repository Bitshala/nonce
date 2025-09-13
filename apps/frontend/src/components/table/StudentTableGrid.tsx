import React from 'react';
import { StudentRow } from './StudentRow';
import type { TableRowData } from '../../types/student';

interface StudentTableGridProps {
  data: TableRowData[];
  week: number;
  canEditFields: boolean;
  canEditAttendance: boolean;
  sortConfig: {
    key: keyof TableRowData | null;
    direction: 'ascending' | 'descending';
  };
  onSort: (config: { key: keyof TableRowData | null; direction: 'ascending' | 'descending' }) => void;
  onStudentClick: (studentName: string) => void;
  onDataUpdate: (data: TableRowData[]) => void;
  onEditedRowsUpdate: (rows: TableRowData[]) => void;
  onContextMenu: (menu: { visible: boolean; x: number; y: number; targetId: number | null }) => void;
}

export const StudentTableGrid: React.FC<StudentTableGridProps> = ({
  data,
  week,
  canEditFields,
  sortConfig,
  onSort,
  onStudentClick,
  onDataUpdate,
  onEditedRowsUpdate,
  onContextMenu,
  canEditAttendance,
}) => {
  const requestSort = (key: keyof TableRowData) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    onSort({ key, direction });
  };

  const getSortIndicator = (key: keyof TableRowData) =>
    sortConfig.key === key
      ? sortConfig.direction === 'ascending'
        ? ' 🔼'
        : ' 🔽'
      : '';

  return (
    <div className="shadow-lg overflow-hidden bg-zinc-900">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-900">
          <thead className="bg-zinc-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th
                scope="col"
                rowSpan={2}
                className="px-6 py-3 text-left text-xs font-semibold text-zinc-700 uppercase hover:bg-orange-50 tracking-wider align-middle cursor-pointer bg-orange-200 transition-colors duration-200 border-b border-zinc-200"
                onClick={() => requestSort('name')}
              >
                Name{getSortIndicator('name')}
              </th>
              <th
                scope="col"
                rowSpan={2}
                className="px-6 py-3 text-left text-xs font-semibold text-zinc-700 uppercase hover:bg-orange-50 tracking-wider align-middle bg-orange-200 hidden sm:table-cell border-b border-zinc-200"
              >
                Email
              </th>
              {week > 0 && (
                <th
                  scope="col"
                  rowSpan={2}
                  className="px-6 py-3 text-left text-xs font-semibold text-zinc-700 hover:bg-orange-50 bg-orange-200 uppercase tracking-wider hidden sm:table-cell align-middle cursor-pointer transition-colors duration-200 border-b border-zinc-200"
                  onClick={() => requestSort('group')}
                >
                  Group{getSortIndicator('group')}
                </th>
              )}
              <th
                scope="col"
                rowSpan={2}
                className="px-6 py-3 text-left text-xs font-semibold text-zinc-700 hover:bg-orange-50 bg-orange-200 uppercase tracking-wider hidden md:table-cell align-middle border-b border-zinc-200"
              >
                TA
              </th>
              <th
                scope="col"
                rowSpan={2}
                className="px-6 py-3 text-left text-xs font-semibold text-zinc-700 hover:bg-orange-50 bg-orange-200 uppercase tracking-wider hidden lg:table-cell align-middle border-b border-zinc-200"
              >
                Attendance
              </th>
              <th
                scope="col"
                colSpan={4}
                className="px-6 py-3 text-center text-xs font-semibold hover:bg-orange-50 uppercase tracking-wider bg-orange-200 text-zinc-700 border-b border-zinc-200"
              >
                GD SCORE
              </th>
              <th
                scope="col"
                colSpan={3}
                className="px-6 py-3 text-center text-xs font-semibold hover:bg-orange-50 uppercase tracking-wider bg-orange-200 text-zinc-700 border-b border-zinc-200"
              >
                BONUS SCORE
              </th>
              <th
                scope="col"
                colSpan={4}
                className="px-6 py-3 text-center text-xs font-semibold hover:bg-orange-50 text-orange-700 uppercase tracking-wider bg-orange-200 text-zinc-700 border-b border-zinc-200"
              >
                EXERCISE SCORES
              </th>
              <th
                scope="col"
                rowSpan={2}
                className="px-6 py-3 text-center text-xs font-semibold text-zinc-700 uppercase tracking-wider align-middle cursor-pointer hover:bg-orange-50 bg-orange-200 text-zinc-700 transition-colors duration-200 border-b border-zinc-200"
                onClick={() => requestSort('total')}
              >
                Total{getSortIndicator('total')}
              </th>
            </tr>
            <tr className="bg-zinc-50">
              <th className="px-3 py-2 text-center text-xs font-medium text-zinc-600 uppercase tracking-wider bg-orange-100 border-b border-zinc-200">
                Communication
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-zinc-600 uppercase tracking-wider bg-orange-100 border-b border-zinc-200">
                Depth Of Answer
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-zinc-600 uppercase tracking-wider bg-orange-100 border-b border-zinc-200">
                Technical Bitcoin Fluency
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-zinc-600 uppercase tracking-wider bg-orange-100 border-b border-zinc-200">
                Engagement
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-zinc-600 uppercase tracking-wider bg-orange-100 border-b border-zinc-200">
                Attempt
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-zinc-600 uppercase tracking-wider bg-orange-100 border-b border-zinc-200">
                Good
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-zinc-600 uppercase tracking-wider bg-orange-100 border-b border-zinc-200">
                Follow Up
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-zinc-600 uppercase tracking-wider bg-orange-100 border-b border-zinc-200">
                Submitted
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-zinc-600 uppercase tracking-wider bg-orange-100 border-b border-zinc-200">
                Github Test
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-zinc-600 uppercase tracking-wider bg-orange-100 border-b border-zinc-200">
                Good Structure
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-zinc-600 uppercase tracking-wider bg-orange-100 border-b border-zinc-200">
                Good doc
              </th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-zinc-200">
            {data.map(person => (
              <StudentRow
                key={person.id}
                person={person}
                week={week}
                canEditFields={canEditFields}
                canEditAttendance={canEditAttendance}
                onStudentClick={onStudentClick}
                onDataUpdate={onDataUpdate}
                onEditedRowsUpdate={onEditedRowsUpdate}
                onContextMenu={onContextMenu}
                allData={data}
              />
            ))}
          </tbody>
        </table>
      </div>
      
      {data.length === 0 && (
        <div className="text-center py-10 text-zinc-500">
          No data available.
        </div>
      )}
      
      {data.length > 0 && (
        <div className="px-4 py-3 flex items-center justify-between border-t border-zinc-200 sm:px-6">
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-zinc-700">
                Showing <span className="font-medium">1</span> to{' '}
                <span className="font-medium">{Math.min(10, data.length)}</span> of{' '}
                <span className="font-medium">{data.length}</span> results
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};