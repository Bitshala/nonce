import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CohortCard from '../components/CohortCard';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const AUTH_TOKEN = import.meta.env.VITE_AUTH_TOKEN_TA;

export const CohortSelection = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const cohorts = [
    {
      title: 'LBTCL',
      students: 90,
      status: 'Inactive',
      dbPath: 'lbtcl_cohort.db',
    },
    {
      title: 'Programming Bitcoin',
      students: 97,
      status: 'Active',
      dbPath: 'pb_cohort.db',
    },
    {
      title: 'BPD',
      students: NaN,
      status: 'Inactive',
      dbPath: 'bpd_cohort.db',
    },
    {
      title: 'MB',
      students: 20,
      status: 'Upcoming',
      dbPath: 'mb_cohort.db',
    },
  ];

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('token')) {
      url.searchParams.delete('token');
      window.history.replaceState({}, document.title, url.pathname);
    }
  }, []);

  const token = localStorage.getItem('bitshala_token');

  const switchCohort = async (dbPath: string, cohortTitle: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/switch_cohort`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `${AUTH_TOKEN}`,
        },
        body: JSON.stringify({ db_path: dbPath }),
      });

      const result = await response.json();
      
      if (result.success) {
        localStorage.setItem('selected_cohort', cohortTitle);
        localStorage.setItem('selected_cohort_db_path', dbPath);
        console.log('Successfully switched cohort:', result.message);
        navigate('/admin', { state: { token } });
      } else {
        console.error('Failed to switch cohort:', result.message);
        alert('Failed to switch cohort: ' + result.message);
      }
    } catch (error) {
      console.error('Error switching cohort:', error);
      alert('Error switching cohort. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCohortClick = (dbPath: string, cohortTitle: string) => {
    switchCohort(dbPath, cohortTitle);
  };

  return (
    <div className="min-h-screen bg-zinc-900 font-mono flex flex-col items-center justify-center">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-200 mb-2">
          Cohort Selection
        </h1>
        <p className="text-gray-700">Select a cohort to Manage Students.</p>
      </div>

      <div className="flex flex-wrap justify-center">
        {cohorts.map(cohort => (
          <CohortCard
            key={cohort.title}
            status={cohort.status}
            title={cohort.title}
            students={cohort.students}
            onClick={() => handleCohortClick(cohort.dbPath, cohort.title)}
          />
        ))}
      </div>
      
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-zinc-800 p-6 rounded-lg text-gray-200">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-200 mx-auto mb-4"></div>
            <p>Switching cohort...</p>
          </div>
        </div>
      )}
    </div>
  );
};
