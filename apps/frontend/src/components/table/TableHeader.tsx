import React from 'react';

interface TableHeaderProps {
  week: number;
  onWeekChange: (week: number) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedGroup: string;
  onGroupChange: (group: string) => void;
  selectedTA: string;
  onTAChange: (ta: string) => void;
  attendanceFilter: 'All' | 'Present' | 'Absent';
  onAttendanceFilterChange: (filter: 'All' | 'Present' | 'Absent') => void;
  baseGroups: string[];
  taOptions: string[];
  totalCount: number | null;
  weeklyData: { week: number; attended: number };
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onAddNew: () => void;
  onDownloadCSV: () => void;
  onClearFilters: () => void;
  navigate: (path: string) => void;
}

export const TableHeader: React.FC<TableHeaderProps> = ({
  onWeekChange,
  searchTerm,
  onSearchChange,
  selectedGroup,
  onGroupChange,
  selectedTA,
  onTAChange,
  attendanceFilter,
  onAttendanceFilterChange,
  baseGroups,
  taOptions,
  totalCount,
  weeklyData,
  isEditing,
  onEdit,
  onSave,
  onAddNew,
  onDownloadCSV,
  onClearFilters,
  navigate,
}) => {
  return (
    <>
      {/* Week Selection Buttons */}
      <div className="flex gap-4 mb-4 items-center">
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <button
            key={i}
            onClick={() => onWeekChange(i)}
            className="cursor-pointer bg-orange-400 hover:bg-orange-500 text-white font-light text-xl px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-200"
          >
            Week {i}
          </button>
        ))}
        <button
          onClick={() => navigate('/result')}
          className="cursor-pointer bg-orange-400 hover:bg-orange-500 text-white font-light text-xl px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-200"
        >
          Result
        </button>
                <button
          onClick={() => navigate('/feedback')}
          className="cursor-pointer bg-orange-400 hover:bg-orange-500 text-white font-light text-xl px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-200"
        >
          Feedback
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-4 items-center">
        <input
          type="text"
          placeholder="Search by name..."
          value={searchTerm}
          onChange={e => onSearchChange(e.target.value)}
          className="px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 flex-grow sm:flex-grow-0 sm:w-auto"
        />

        <select
          value={selectedGroup}
          onChange={e => onGroupChange(e.target.value)}
          className="px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
        >
          {['All Groups', ...baseGroups].map(groupName => (
            <option key={groupName} value={groupName}>
              {groupName}
            </option>
          ))}
        </select>

        <select
          value={selectedTA}
          onChange={e => onTAChange(e.target.value)}
          className="px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
        >
          {taOptions.map(taName => (
            <option key={taName} value={taName}>
              {taName}
            </option>
          ))}
        </select>

        <select
          value={attendanceFilter}
          onChange={e =>
            onAttendanceFilterChange(
              e.target.value as 'All' | 'Present' | 'Absent'
            )
          }
          className="px-3 py-2 border border-zinc-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
        >
          <option value="All">All Attendance</option>
          <option value="Present">Present</option>
          <option value="Absent">Absent</option>
        </select>

        <button
          onClick={onClearFilters}
          className="cursor-pointer px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 border border-zinc-300 rounded-md"
        >
          Clear Filters
        </button>
      </div>

      {/* Stats and Actions */}
      <div className="flex justify-between items-center gap-2 mb-4 mt-8">
        <div className="flex gap-8 text-2xl">
          <div>Total Participants: {totalCount ?? '...'}</div>
          <div>Attendees: {weeklyData.attended ?? 0}</div>
          <div>
            Absentees:{' '}
            {totalCount && weeklyData.attended !== undefined
              ? totalCount - weeklyData.attended
              : '...'}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onAddNew}
            className="cursor-pointer px-4 py-2 bg-orange-400 hover:bg-orange-500 text-white rounded"
          >
            Add New Row
          </button>
          <button
            onClick={onEdit}
            disabled={isEditing}
            className="cursor-pointer px-4 py-2 bg-orange-400 hover:bg-orange-500 text-white rounded disabled:opacity-50"
          >
            Edit
          </button>
          <button
            onClick={onSave}
            disabled={!isEditing}
            className="cursor-pointer px-4 py-2 text-white rounded bg-green-600 hover:bg-green-500 disabled:bg-green-200"
          >
            Save
          </button>
          <button
            onClick={onDownloadCSV}
            className="cursor-pointer px-4 py-2 bg-red-600 text-white rounded"
          >
            Download CSV
          </button>
        </div>
      </div>
    </>
  );
};
