import React from 'react';
import { computeTotal } from '../../utils/calculations';
import type { TableRowData } from '../../types/student';
const baseUrl = import.meta.env.VITE_API_BASE_URL;


interface StudentRowProps {
  person: TableRowData;
  week: number;
  canEditFields: boolean;
  canEditAttendance: boolean;
  onStudentClick: (studentName: string) => void;
  onDataUpdate: (data: TableRowData[]) => void;
  onEditedRowsUpdate: (rows: TableRowData[]) => void;
  onContextMenu: (menu: {
    visible: boolean;
    x: number;
    y: number;
    targetId: number | null;
  }) => void;
  allData: TableRowData[];
}

export const StudentRow: React.FC<StudentRowProps> = ({
  person,
  week,
  canEditFields,
  onStudentClick,
  onDataUpdate,
  onEditedRowsUpdate,
  onContextMenu,
  allData,
  canEditAttendance,
}) => {
  const scoreOptions = [0, 1, 2, 3, 4, 5];

  const handleAttendanceChange = () => {
    const newData = allData.map(p => {
      if (p.id === person.id) {
        const updatedPerson = { ...p, attendance: !p.attendance };
        // Update edited rows
        onEditedRowsUpdate([updatedPerson]);
        return updatedPerson;
      }
      return p;
    });
    onDataUpdate(newData);
  };

  const handleGdScoreChange = (
    key: keyof TableRowData['gdScore'],
    value: string
  ) => {
    const newData = allData.map(p => {
      if (p.id === person.id) {
        const newGdScore = { ...p.gdScore, [key]: parseInt(value) || 0 };
        const updatedPerson = {
          ...p,
          gdScore: newGdScore,
          total: computeTotal({ ...p, gdScore: newGdScore }),
        };
        onEditedRowsUpdate([updatedPerson]);
        return updatedPerson;
      }
      return p;
    });
    onDataUpdate(newData);
  };

  const handleBonusScoreChange = (
    key: keyof TableRowData['bonusScore'],
    value: string
  ) => {
    const newData = allData.map(p => {
      if (p.id === person.id) {
        const newBonusScore = { ...p.bonusScore, [key]: parseInt(value) || 0 };
        const updatedPerson = {
          ...p,
          bonusScore: newBonusScore,
          total: computeTotal({ ...p, bonusScore: newBonusScore }),
        };
        onEditedRowsUpdate([updatedPerson]);
        return updatedPerson;
      }
      return p;
    });
    onDataUpdate(newData);
  };

  const handleExerciseScoreChange = (
    key: keyof TableRowData['exerciseScore']
  ) => {
    const newData = allData.map(p => {
      if (p.id === person.id) {
        const newExerciseScore = {
          ...p.exerciseScore,
          [key]: !p.exerciseScore[key],
        };
        const updatedPerson = {
          ...p,
          exerciseScore: newExerciseScore,
          total: computeTotal({ ...p, exerciseScore: newExerciseScore }),
        };
        onEditedRowsUpdate([updatedPerson]);
        return updatedPerson;
      }
      return p;
    });
    onDataUpdate(newData);
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
        className="cursor-pointer px-6 py-4 whitespace-nowrap"
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

      <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
        <div className="text-sm text-zinc-900">{person.email || '-'}</div>
      </td>

      {week > 0 && (
        <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
          <div className="text-sm text-zinc-900">{person.group}</div>
        </td>
      )}

      <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
        <div className="text-sm text-zinc-500">{person.ta || '-'}</div>
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 hidden lg:table-cell">
        <input
          type="checkbox"
          checked={person.attendance}
          disabled={!canEditAttendance}
          onChange={handleAttendanceChange}
          className="h-4 w-4 text-orange-600 border-zinc-300 rounded focus:ring-orange-500 disabled:cursor-not-allowed"
        />
      </td>

      {/* GD Scores */}
      {(['fa', 'fb', 'fc', 'fd'] as const).map(key => (
        <td
          key={key}
          className="px-3 py-4 whitespace-nowrap text-center text-sm"
        >
          <select
            value={person.gdScore[key]}
            disabled={!canEditFields}
            onChange={e => handleGdScoreChange(key, e.target.value)}
            className="bg-orange-200 rounded-md shadow-sm p-1 text-sm focus:ring-orange-500 focus:border-orange-500 disabled:cursor-not-allowed disabled:bg-zinc-100"
          >
            {scoreOptions.map(val => (
              <option key={val} value={val}>
                {val === 0 ? '-' : val}
              </option>
            ))}
          </select>
        </td>
      ))}

      {/* Bonus Scores */}
      {(['attempt', 'good', 'followUp'] as const).map(key => (
        <td
          key={key}
          className="px-3 py-4 whitespace-nowrap text-center text-sm"
        >
          <select
            value={person.bonusScore[key]}
            disabled={!canEditFields}
            onChange={e => handleBonusScoreChange(key, e.target.value)}
            className="bg-orange-200 rounded-md shadow-sm p-1 text-sm focus:ring-orange-500 focus:border-orange-500 disabled:cursor-not-allowed disabled:bg-zinc-100"
          >
            {scoreOptions.map(val => (
              <option key={val} value={val}>
                {val === 0 ? '-' : val}
              </option>
            ))}
          </select>
        </td>
      ))}

      {/* Exercise Scores */}
      {(['Submitted', 'privateTest', 'goodStructure', 'goodDoc'] as const).map(
        key => (
          <td
            key={key}
            className="px-3 py-4 whitespace-nowrap text-center text-sm"
          >
            <div className="flex gap-2">
              <input
                type="checkbox"
                checked={person.exerciseScore[key]}
                disabled={!canEditFields}
                onChange={() => handleExerciseScoreChange(key)}
                className="h-4 w-4 text-orange-600 rounded focus:ring-orange-500 disabled:cursor-not-allowed disabled:bg-zinc-100"
              />
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
      <td className="px-6 py-4 text-center text-sm font-medium text-zinc-700">
        {person.total}
      </td>
    </tr>
  );
};
