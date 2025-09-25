import React from 'react';

import type { TableRowData } from '../../types/student';
const baseUrl = import.meta.env.VITE_API_BASE_URL;


interface StudentRowProps {
  person: TableRowData;
  week: number;
  onStudentClick: (studentName: string) => void;
  onEditStudent: (student: TableRowData) => void;
  onContextMenu: (menu: {
    visible: boolean;
    x: number;
    y: number;
    targetId: number | null;
  }) => void;
}

export const StudentRow: React.FC<StudentRowProps> = ({
  person,
  week,
  onStudentClick,
  onEditStudent,
  onContextMenu,
}) => {
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditStudent(person);
  };

  const handleNameRightClick = (
    event: React.MouseEvent<HTMLTableCellElement>
  ) => {
    event.preventDefault();
    onContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      targetId: person.id,
    });
  };

  const fetchStudentRepoLink = async (week: number, studentName: string) => {
    try {
      const response = await fetch(
        `${baseUrl}/students/${week}/${encodeURIComponent(studentName)}`
      );

      if (!response.ok) {
        console.error(`Server Error ${response.status}`);
        return;
      }

      const data = await response.json();
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      console.error('fetchStudentRepoLink error:', err);
    }
  };

  return (
    <tr className="cursor-pointer hover:bg-zinc-50 transition-colors duration-150">
      <td
        className="cursor-pointer px-8 py-6 whitespace-nowrap"
        onClick={() => onStudentClick(person.name)}
        onContextMenu={handleNameRightClick}
      >
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-medium">
              {person.name.charAt(0)}
              {(person.name.split(' ')[1]?.charAt(0) || '').toUpperCase()}
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-zinc-900">
              {person.name}
            </div>
          </div>
        </div>
      </td>

      <td className="px-8 py-6 whitespace-nowrap hidden sm:table-cell">
        <div className="text-sm text-zinc-900">{person.email || '-'}</div>
      </td>

      {week > 0 && (
        <td className="px-8 py-6 whitespace-nowrap hidden sm:table-cell">
          <div className="text-sm text-zinc-900">{person.group}</div>
        </td>
      )}

      <td className="px-8 py-6 whitespace-nowrap hidden md:table-cell">
        <div className="text-sm text-zinc-500">{person.ta || '-'}</div>
      </td>

      <td className="px-8 py-6 whitespace-nowrap text-sm text-zinc-500 hidden lg:table-cell">
        <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${
          person.attendance
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {person.attendance ? 'Present' : 'Absent'}
        </span>
      </td>

      {/* GD Scores */}
      {(['fa', 'fb', 'fc', 'fd'] as const).map(key => (
        <td
          key={key}
          className="px-4 py-6 whitespace-nowrap text-center text-sm"
        >
          <span className="text-sm font-medium text-zinc-900">
            {person.gdScore[key] === 0 ? '-' : person.gdScore[key]}
          </span>
        </td>
      ))}

      {/* Bonus Scores */}
      {(['attempt', 'good', 'followUp'] as const).map(key => (
        <td
          key={key}
          className="px-4 py-6 whitespace-nowrap text-center text-sm"
        >
          <span className="text-sm font-medium text-zinc-900">
            {person.bonusScore[key] === 0 ? '-' : person.bonusScore[key]}
          </span>
        </td>
      ))}

      {/* Exercise Scores */}
      {(['Submitted', 'privateTest'] as const).map(
        key => (
          <td
            key={key}
            className="px-4 py-6 whitespace-nowrap text-center text-sm"
          >
            <div className="flex items-center justify-center gap-2">
              <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${
                person.exerciseScore[key]
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {person.exerciseScore[key] ? '✓' : '✗'}
              </span>
              {key === 'Submitted' && person.exerciseScore[key] === true && (
                <svg
                  onClick={() => fetchStudentRepoLink(week, person.name)}
                  xmlns="http://www.w3.org/2000/svg"
                  x="0px"
                  y="0px"
                  width="20"
                  height="20"
                  viewBox="0 0 50 50"
                  className="cursor-pointer"
                >
                  <path d="M 25 2 C 12.309295 2 2 12.309295 2 25 C 2 37.690705 12.309295 48 25 48 C 37.690705 48 48 37.690705 48 25 C 48 12.309295 37.690705 2 25 2 z M 25 4 C 36.609824 4 46 13.390176 46 25 C 46 36.609824 36.609824 46 25 46 C 13.390176 46 4 36.609824 4 25 C 4 13.390176 13.390176 4 25 4 z M 25 11 A 3 3 0 0 0 22 14 A 3 3 0 0 0 25 17 A 3 3 0 0 0 28 14 A 3 3 0 0 0 25 11 z M 21 21 L 21 23 L 22 23 L 23 23 L 23 36 L 22 36 L 21 36 L 21 38 L 22 38 L 23 38 L 27 38 L 28 38 L 29 38 L 29 36 L 28 36 L 27 36 L 27 21 L 26 21 L 22 21 L 21 21 z"></path>
                </svg>
              )}
            </div>
          </td>
        )
      )}

      {/* Total Score */}
      <td className="px-8 py-6 text-center text-sm font-medium text-zinc-700">
        {person.total}
      </td>

      {/* Edit Button */}
      <td className="px-8 py-6 text-center text-sm">
        <button
          onClick={handleEditClick}
          className="inline-flex items-center px-4 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-200"
        >
          Edit
        </button>
      </td>
    </tr>
  );
};
