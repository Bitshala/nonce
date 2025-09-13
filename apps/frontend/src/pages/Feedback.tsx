import { useState, useEffect } from 'react';
import DataTable from '../components/DataTable.tsx';

interface FeedbackResponse {
  timestamp: string;
  discord_name: string;
  name_on_certificate: string;
  academic_background: string;
  skills: string;
  session_instructions: string;
  study_material: string;
  group_discussions: string;
  lounge_discussions: string;
  deputy: string;
  teaching_assistants: string;
  bitshala_clubs: string;
  bitdev_meetups: string;
  bitspace: string;
  fellowships: string;
  expectations: string;
  improvement_ideas: string;
  bitcoin_opportunities: string;
  fellowship_projects: string;
  ideal_project: string;
  testimonial: string;
}

const FeedbackTable = () => {
  const [feedbacks, setFeedbacks] = useState<FeedbackResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cohort_name = localStorage.getItem('selected_cohort_db_path') || 'lbtcl_cohort.db';
  // Define columns configuration
  const columns = [
    {
      key: 'timestamp',
      label: 'Timestamp',
      type: 'date' as const,
      sortable: true,
    },
    {
      key: 'discord_name',
      label: 'Discord Name',
      sortable: true,
      render: (value: string) => (
        <span className="font-medium text-blue-600">{value}</span>
      )
    },
    {
      key: 'name_on_certificate',
      label: 'Certificate Name',
      sortable: true,
    },
    {
      key: 'academic_background',
      label: 'Academic Background',
      type: 'truncate' as const,
      sortable: true,
    },
    {
      key: 'skills',
      label: 'Skills',
      type: 'truncate' as const,
    },
    // Expandable columns (shown in detail view)
    {
      key: 'session_instructions',
      label: 'Session Instructions',
      expandable: true,
    },
    {
      key: 'study_material',
      label: 'Study Material',
      expandable: true,
    },
    {
      key: 'group_discussions',
      label: 'Group Discussions',
      expandable: true,
    },
    {
      key: 'lounge_discussions',
      label: 'Lounge Discussions',
      expandable: true,
    },
    {
      key: 'deputy',
      label: 'Deputy',
      expandable: true,
    },
    {
      key: 'teaching_assistants',
      label: 'Teaching Assistants',
      expandable: true,
    },
    {
      key: 'bitshala_clubs',
      label: 'Bitshala Clubs',
      expandable: true,
    },
    {
      key: 'bitdev_meetups',
      label: 'Bitdev Meetups',
      expandable: true,
    },
    {
      key: 'bitspace',
      label: 'Bitspace',
      expandable: true,
    },
    {
      key: 'fellowships',
      label: 'Fellowships',
      expandable: true,
    },
    {
      key: 'expectations',
      label: 'Expectations',
      expandable: true,
    },
    {
      key: 'improvement_ideas',
      label: 'Improvement Ideas',
      expandable: true,
    },
    {
      key: 'bitcoin_opportunities',
      label: 'Bitcoin Opportunities',
      expandable: true,
    },
    {
      key: 'fellowship_projects',
      label: 'Fellowship Projects',
      expandable: true,
    },
    {
      key: 'ideal_project',
      label: 'Ideal Project',
      expandable: true,
    },
    {
      key: 'testimonial',
      label: 'Testimonial',
      expandable: true,
      expandableClassName: 'md:col-span-2 lg:col-span-3', // Full width in expanded view
    },
  ];

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        setLoading(true);
        // Replace with your actual API call
        console.log('Fetching feedbacks from API...');
        const baseUrl = import.meta.env.VITE_API_BASE_URL;
        const response = await fetch(`${baseUrl}/feedback/${cohort_name}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch feedback data');
        }

        const data = await response.json();
        
        // Ensure data is an array
        const feedbackArray = Array.isArray(data) ? data : [];
        setFeedbacks(feedbackArray);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setLoading(false);
      }
    };

    fetchFeedbacks();
  }, [cohort_name]);

  // Show custom message for no feedback
  if (!loading && !error && feedbacks.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4 font-inter">No Feedback Available</h1>
          <p className="text-zinc-400 font-inter">No feedback available for this cohort</p>
        </div>
      </div>
    );
  }

  return (
    <DataTable
      data={feedbacks}
      columns={columns}
      title="Feedback Responses"
      loading={loading}
      error={error}
      searchable={true}
      sortable={true}
      expandable={true}
      pageSize={10}
      className="max-w-screen mx-auto"
    />
  );
};

export default FeedbackTable;
