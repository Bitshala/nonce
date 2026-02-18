import type { ReactNode } from 'react';
import StatusBadge from './StatusBadge';

export type CohortRow = {
  id: string;
  name: string;
  type: string;
  season: number;
  status: string;
  startDate: string;
  endDate: string;
  weeks?: number;
  participants?: number;
  applications?: number;
  raw?: unknown;
};

type CohortTableProps = {
  cohorts: CohortRow[];
  onRowClick?: (cohort: CohortRow) => void;
  actions?: (cohort: CohortRow) => ReactNode;
  loading?: boolean;
  emptyMessage?: string;
};

const formatDate = (iso: string): string => {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '-';
  }
};

const CohortTable = ({
  cohorts,
  onRowClick,
  actions,
  loading = false,
  emptyMessage = 'No cohorts found.',
}: CohortTableProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-zinc-600 border-t-orange-500" />
          <p className="text-zinc-400 text-base">Loading cohorts...</p>
        </div>
      </div>
    );
  }

  if (cohorts.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-zinc-500 text-base">{emptyMessage}</p>
      </div>
    );
  }

  const hasWeeks = cohorts.some((c) => c.weeks !== undefined);
  const hasParticipants = cohorts.some((c) => c.participants !== undefined);
  const hasApplications = cohorts.some((c) => c.applications !== undefined);

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-700/50">
            <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-500 uppercase tracking-wider">
              Cohort
            </th>
            <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-500 uppercase tracking-wider">
              Season
            </th>
            <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-500 uppercase tracking-wider">
              Status
            </th>
            {hasWeeks && (
              <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-500 uppercase tracking-wider hidden sm:table-cell">
                Weeks
              </th>
            )}
            {hasParticipants && (
              <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-500 uppercase tracking-wider hidden sm:table-cell">
                Participants
              </th>
            )}
            {hasApplications && (
              <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-500 uppercase tracking-wider hidden sm:table-cell">
                Applications
              </th>
            )}
            <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-500 uppercase tracking-wider hidden md:table-cell">
              Start Date
            </th>
            <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-500 uppercase tracking-wider hidden md:table-cell">
              End Date
            </th>
            {actions && (
              <th className="text-right px-6 py-4 text-sm font-semibold text-zinc-500 uppercase tracking-wider">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-700/30">
          {cohorts.map((cohort) => (
            <tr
              key={cohort.id}
              onClick={() => onRowClick?.(cohort)}
              className={`transition-colors duration-150 ${
                onRowClick ? 'cursor-pointer hover:bg-zinc-700/30' : ''
              }`}
            >
              <td className="px-6 py-5">
                <span className="text-base font-medium text-zinc-100">{cohort.name}</span>
              </td>
              <td className="px-6 py-5">
                <span className="text-base text-zinc-300">S{cohort.season}</span>
              </td>
              <td className="px-6 py-5">
                <StatusBadge status={cohort.status} />
              </td>
              {hasWeeks && (
                <td className="px-6 py-5 hidden sm:table-cell">
                  <span className="text-base text-zinc-300">
                    {cohort.weeks !== undefined ? cohort.weeks : '-'}
                  </span>
                </td>
              )}
              {hasParticipants && (
                <td className="px-6 py-5 hidden sm:table-cell">
                  <span className="text-base text-zinc-300">
                    {cohort.participants !== undefined ? cohort.participants : '-'}
                  </span>
                </td>
              )}
              {hasApplications && (
                <td className="px-6 py-5 hidden sm:table-cell">
                  <span className="text-base text-zinc-300">
                    {cohort.applications !== undefined ? cohort.applications : '-'}
                  </span>
                </td>
              )}
              <td className="px-6 py-5 hidden md:table-cell">
                <span className="text-base text-zinc-400">{formatDate(cohort.startDate)}</span>
              </td>
              <td className="px-6 py-5 hidden md:table-cell">
                <span className="text-base text-zinc-400">{formatDate(cohort.endDate)}</span>
              </td>
              {actions && (
                <td className="px-6 py-5 text-right">
                  <div className="flex items-center justify-end gap-2 flex-nowrap" onClick={(e) => e.stopPropagation()}>
                    {actions(cohort)}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CohortTable;
