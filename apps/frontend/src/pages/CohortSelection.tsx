import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCohorts } from '../hooks/cohortHooks';
import { useUser } from '../hooks/userHooks';
import { UserRole } from '../types/enums';
import CohortCard from '../components/CohortCard';

type ApiCohort = {
  id: string;
  type: string; // e.g. "PROGRAMMING_BITCOIN"
  season: number;
  startDate: string; // ISO
  endDate: string;   // ISO
  registrationDeadline: string; // ISO
  weeks: unknown[];
};

type ViewCohort = {
  id: string;
  title: string;
  students?: number;
  status: 'Active' | 'Inactive' | 'Upcoming';
  startDate: string;
  endDate: string;
  raw: ApiCohort;
};

const prettifyType = (t: string) =>
  t
    .toLowerCase()
    .split('_')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');

const computeStatus = (startISO: string, endISO: string): ViewCohort['status'] => {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const now = new Date();

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Inactive';
  if (now < start) return 'Upcoming';
  if (now > end) return 'Inactive';
  return 'Active';
};

// Optional: sort by status then start date
const statusRank: Record<ViewCohort['status'], number> = {
  Active: 0,
  Upcoming: 1,
  Inactive: 2,
};

export const CohortSelection = () => {
  const navigate = useNavigate();
  const { data, isLoading, error } = useCohorts({ page: 0, pageSize: 100 });
  const { data: user } = useUser();
  const isAdmin = user?.role === UserRole.ADMIN;

  const cohorts: ViewCohort[] = useMemo(() => {
    const records: ApiCohort[] = data?.records ?? [];
    return records
      .map((c) => ({
        id: c.id,
        title: `${prettifyType(c.type)} • S${c.season}`,
        students: undefined, // or derive from API if available
        status: computeStatus(c.startDate, c.endDate),
        startDate: c.startDate,
        endDate: c.endDate,
        raw: c,
      }))
      .sort((a, b) => {
        const sr = statusRank[a.status] - statusRank[b.status];
        if (sr !== 0) return sr;
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      });
  }, [data]);

  const handleSelect = useCallback((cohort: ViewCohort) => {
    // Pass the cohort along (param + state for convenience)
    navigate(`/admin/cohort/${cohort.id}`, { state: { cohort: cohort.raw } });
  }, [navigate]);

  const showEmpty = !isLoading && !error && cohorts.length === 0;

  return (
    <div className="min-h-screen bg-zinc-900 font-mono flex flex-col items-center justify-center p-6 relative">
      {/* Admin pencil icon - top right */}
      {isAdmin && (
        <button
          onClick={() => navigate('/admin')}
          className="b-0 absolute top-6 right-6 p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          title="Create Cohort"
        >
          <svg className="w-5 h-5 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      )}

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-200 mb-2">
          Cohort Selection
        </h1>
        <p className="text-gray-400">Select a cohort to manage students.</p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-red-200">
          {(error as Error)?.message ?? 'Failed to load cohorts.'}
        </div>
      )}

      {showEmpty && (
        <div className="text-gray-400">No cohorts found.</div>
      )}

      <div className="flex flex-wrap justify-center gap-4">
        {cohorts.map((cohort) => (
          <CohortCard
            key={cohort.id}
            status={cohort.status}
            title={cohort.title}
            students={cohort.students ?? 0}
            onClick={() => handleSelect(cohort)}
          />
        ))}
      </div>

      {isLoading && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center"
          aria-busy="true"
          aria-live="polite"
        >
          <div className="bg-zinc-800 p-6 rounded-2xl text-gray-200 shadow-xl">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-200 mx-auto mb-4" />
            <p>Loading cohorts…</p>
          </div>
        </div>
      )}
    </div>
  );
};
