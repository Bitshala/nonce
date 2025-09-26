import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CohortCard from '../components/CohortCard';
import apiClient from '../services/api';

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
  raw: ApiCohort; // keep the full API record for storage/use later
};

const prettifyType = (t: string) =>
  t
    .toLowerCase()
    .split('_')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');

const computeStatus = (startISO: string, endISO: string): ViewCohort['status'] => {
  const now = new Date();
  const start = new Date(startISO);
  const end = new Date(endISO);
  if (now < start) return 'Upcoming';
  if (now > end) return 'Inactive';
  return 'Active';
};

export const CohortSelection = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [cohorts, setCohorts] = useState<ViewCohort[]>([]);
  const [error, setError] = useState<string | null>(null);

  // strip ?token from URL if present (kept from your original)
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('token')) {
      url.searchParams.delete('token');
      window.history.replaceState({}, document.title, url.pathname);
    }
  }, []);

  const token = useMemo(() => localStorage.getItem('user_session_token') ?? '', []);

  const getCohortsFromApi = async () => {
    setLoading(true);
    setError(null);
    console.log('Fetching cohorts with token:', token);
    try {
      const response = await apiClient.get('/cohorts');
      const result = response.data;

      // Accept either { records: [...] } or { success: true, cohorts: [...] }
      const list: ApiCohort[] = Array.isArray(result?.records)
        ? result.records
        : Array.isArray(result?.cohorts)
        ? result.cohorts
        : [];

      if (!Array.isArray(list)) {
        throw new Error('Unexpected response shape.');
      }

      const mapped: ViewCohort[] = list.map((c) => ({
        id: c.id,
        title: `${prettifyType(c.type)} • S${c.season}`,
        students: undefined, // or 0 if CohortCard requires a number
        status: computeStatus(c.startDate, c.endDate),
        startDate: c.startDate,
        endDate: c.endDate,
        raw: c,
      }));

      setCohorts(mapped);
    } catch (e: unknown) {
      console.error('Error fetching cohorts:', e);
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('Failed to fetch cohorts.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCohortsFromApi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = (cohort: ViewCohort) => {
    // Store a compact object for quick reads
    const compact = {
      id: cohort.id,
      title: cohort.title,
      type: cohort.raw.type,
      season: cohort.raw.season,
      startDate: cohort.startDate,
      endDate: cohort.endDate,
      status: cohort.status,
    };

    localStorage.setItem('selected_cohort', JSON.stringify(compact));
    // Optionally store the full API cohort for richer admin use
    localStorage.setItem('selected_cohort_full', JSON.stringify(cohort.raw));

    // Navigate to /admin (you can also pass state if you prefer)
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-zinc-900 font-mono flex flex-col items-center justify-center p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-200 mb-2">
          Cohort Selection
        </h1>
        <p className="text-gray-400">Select a cohort to manage students.</p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-red-200">
          {error}
        </div>
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

      {loading && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
          <div className="bg-zinc-800 p-6 rounded-2xl text-gray-200 shadow-xl">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-200 mx-auto mb-4"></div>
            <p>Loading cohorts…</p>
          </div>
        </div>
      )}
    </div>
  );
};
