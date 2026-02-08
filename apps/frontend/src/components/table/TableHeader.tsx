import React from 'react';

interface Week {
  id: string;
  week: number;
  questions: string[];
  bonusQuestion: string[];
  classroomUrl: string;
  classroomInviteLink: string;
}

interface TableHeaderProps {
  week: number;
  selectedWeekId: string;
  weeks: Week[];
  onWeekChange: (week: number, weekId: string) => void;
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
  onAddNew: () => void;
  onDownloadCSV: () => void;
  onAssignGroups: () => void;
  onTASelfAssign?: () => void;
  onClearFilters: () => void;
  navigate: (path: string) => void;
  cohortType?: string;
  cohortId?: string;
  isTA?: boolean;
}

export const TableHeader: React.FC<TableHeaderProps> = ({
  week,
  selectedWeekId,
  weeks,
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
  onAssignGroups,
  onTASelfAssign,
  onClearFilters,
  navigate,
  cohortType,
  cohortId,
  isTA,
}) => {
  return (
    <>
      {/* Week Selection Buttons */}
      <div className="flex gap-4 mb-4 items-center">
        {weeks.map(weekData => (
          <button
            key={weekData.id}
            onClick={() => onWeekChange(weekData.week, weekData.id)}
            className={`cursor-pointer font-light border-0 text-xl px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-200 ${
              selectedWeekId === weekData.id
                ? 'bg-orange-600 text-white'
                : 'bg-orange-400 hover:bg-orange-500 text-white'
            }`}
          >
            Week {weekData.week}
          </button>
        ))}
        {/*<button*/}
        {/*  onClick={() => navigate('/result')}*/}
        {/*  className="cursor-pointer bg-orange-400 hover:bg-orange-500 text-white font-light text-xl px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-200"*/}
        {/*>*/}
        {/*  Result*/}
        {/*</button>*/}
        {/*        <button*/}
        {/*  onClick={() => navigate('/feedback')}*/}
        {/*  className="cursor-pointer bg-orange-400 hover:bg-orange-500 text-white font-light text-xl px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-200"*/}
        {/*>*/}
        {/*  Feedback*/}
        {/*</button>*/}
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
          {(cohortType === 'MASTERING_BITCOIN' || cohortType === 'LEARNING_BITCOIN_FROM_COMMAND_LINE' || cohortType === 'MASTERING_LIGHTNING_NETWORK') && (
            <button
              onClick={() => {
                if (cohortId) {
                  navigate(`/${cohortId}/instructions`);
                } else if (cohortType === 'MASTERING_BITCOIN') {
                  navigate('/mb-instructions');
                } else if (cohortType === 'LEARNING_BITCOIN_FROM_COMMAND_LINE') {
                  navigate('/lbtcl-instructions');
                } else if (cohortType === 'MASTERING_LIGHTNING_NETWORK') {
                  navigate('/ln-instructions');
                }
              }}
              className="cursor-pointer px-4 py-2 bg-orange-400 hover:bg-orange-500 text-white rounded"
            >
              Cohort Instructions
            </button>
          )}
          {week > 0 && (
            <button
              onClick={onAssignGroups}
              className="cursor-pointer px-4 py-2 bg-orange-400 hover:bg-orange-500 text-white rounded"
            >
              Assign Groups
            </button>
          )}
          {isTA && onTASelfAssign && week > 0 && (
            <button
              onClick={onTASelfAssign}
              className="cursor-pointer px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
            >
              Assign Self to Group
            </button>
          )}
          {/*<button*/}
          {/*  onClick={onAddNew}*/}
          {/*  className="cursor-pointer px-4 py-2 bg-orange-400 hover:bg-orange-500 text-white rounded"*/}
          {/*  >*/}
          {/*    Add New Row*/}
          {/*  </button>*/}
          {/*  <button*/}
          {/*    onClick={onDownloadCSV}*/}
          {/*    className="cursor-pointer px-4 py-2 bg-red-600 text-white rounded"*/}
          {/*  >*/}
          {/*    Download CSV*/}
          {/*  </button>*/}
        </div>
      </div>
    </>
  );
};
