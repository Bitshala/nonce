import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GetCohortResponseDto } from '../types/api';
import type { FeedbackFormData } from '../types/feedback';

interface CohortFeedbackFormProps {
  cohorts: GetCohortResponseDto[];
  isLoading: boolean;
  onSubmit: (data: FeedbackFormData) => Promise<void>;
}

const CohortFeedbackForm = ({ cohorts, isLoading, onSubmit }: CohortFeedbackFormProps) => {
  const navigate = useNavigate();
  const [selectedCohortId, setSelectedCohortId] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    try {
      await onSubmit({ cohortId: selectedCohortId, feedback });
      // Reset form on success
      setSelectedCohortId('');
      setFeedback('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-8 space-y-6 border border-zinc-700/50">
      <div className="text-left mb-8">
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">Share Your Feedback</h2>
        <p className="text-zinc-400">Help us improve by sharing your thoughts about your cohort experience</p>
      </div>

      {/* Cohort Selector */}
      <div className="space-y-2 w-xl">
        <label htmlFor="cohort" className="block text-sm font-semibold text-zinc-300">
          Select Cohort <span className="text-red-400">*</span>
        </label>
        {isLoading ? (
          <div className="px-4 py-3 bg-zinc-700/50 rounded-lg text-zinc-400">
            Loading your cohorts...
          </div>
        ) : cohorts.length > 0 ? (
          <select
            id="cohort"
            value={selectedCohortId}
            onChange={(e) => setSelectedCohortId(e.target.value)}
            className=" px-4 py-3 bg-zinc-700/50 border border-zinc-600 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
            required
          >
            <option value="" className="bg-zinc-800">Choose a cohort...</option>
            {cohorts.map((cohort) => (
              <option key={cohort.id} value={cohort.id} className="bg-zinc-800">
                {cohort.type.replace(/_/g, ' ')} - {new Date(cohort.startDate).toLocaleDateString()}
              </option>
            ))}
          </select>
        ) : (
          <div className="w-full  rounded-lg text-zinc-400">
            You are not enrolled in any cohorts yet. <button type="button" onClick={() => navigate('/myDashboard')} className="bg-transparent b-0 text-white hover:underline">Join a cohort</button>
          </div>
        )}
      </div>

      {/* Feedback Textarea */}
      <div className="space-y-2 w-xl">
        <label htmlFor="feedback" className="block text-sm font-semibold text-zinc-300">
          Your Feedback <span className="text-red-400">*</span>
        </label>
        <textarea
          id="feedback"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={8}
          className="w-full px-4 py-3 outline-none  bg-zinc-700/50 border border-zinc-600 rounded-lg text-zinc-100 placeholder-zinc-500 b-0 transition-all resize-none"
          placeholder="Share your thoughts, suggestions, or experiences..."
          required
        />
        <p className="text-xs text-zinc-500">{feedback.length} characters</p>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting || !selectedCohortId || !feedback.trim()}
        className="b-0 max-w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 hover:scale-[1.02] disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-800"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Submitting...
          </span>
        ) : (
          'Submit Feedback'
        )}
      </button>
    </form>
  );
};

export default CohortFeedbackForm;
