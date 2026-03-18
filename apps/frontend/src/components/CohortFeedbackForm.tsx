import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GetCohortResponseDto } from '../types/api';
import {
  CohortComponent,
  ComponentRating,
  FellowshipInterest,
  OpportunityInterest,
} from '../types/enums';
import type { FeedbackFormData } from '../types/feedback';

interface Props {
  cohorts: GetCohortResponseDto[];
  isLoading: boolean;
  onSubmit: (data: FeedbackFormData) => Promise<void>;
}

const COMPONENT_LABELS: Record<CohortComponent, string> = {
  [CohortComponent.SESSION_INSTRUCTIONS]: 'Session Instructions',
  [CohortComponent.STUDY_MATERIAL]: 'Study Material',
  [CohortComponent.GROUP_DISCUSSIONS]: 'Group Discussions',
  [CohortComponent.LOUNGE_DISCUSSIONS]: 'Lounge Discussions',
  [CohortComponent.DEPUTY]: 'Deputy',
  [CohortComponent.TEACHING_ASSISTANTS]: 'Teaching Assistants',
  [CohortComponent.BITSHALA_CLUBS]: 'Bitshala Clubs',
  [CohortComponent.BITDEV_MEETUPS]: 'Bitdev Meetups',
  [CohortComponent.BITSPACE]: 'Bitspace',
  [CohortComponent.FELLOWSHIPS]: 'Fellowships',
};

const RATING_LABELS: Record<ComponentRating, string> = {
  [ComponentRating.NOT_AT_ALL]: 'Not at all',
  [ComponentRating.SOMEWHAT]: 'Somewhat',
  [ComponentRating.HELPFUL]: 'Helpful',
  [ComponentRating.VERY_HELPFUL]: 'Very Helpful',
};

const OPPORTUNITY_LABELS: Record<OpportunityInterest, string> = {
  [OpportunityInterest.DEVELOPER]: 'Developer',
  [OpportunityInterest.DESIGNER_CREATIVE]: 'Designer / Creative',
  [OpportunityInterest.EDUCATION_WRITING]: 'Education / Writing',
  [OpportunityInterest.PROGRAM_OPS]: 'Program Ops',
  [OpportunityInterest.LEGAL_ACCOUNTS]: 'Legal / Accounts',
  [OpportunityInterest.BUILDING_STARTUP]: 'Building a Startup',
  [OpportunityInterest.HOSTING_CLUB]: 'Hosting a Club',
  [OpportunityInterest.JUST_STACKING]: 'Just Stacking',
};

const FELLOWSHIP_LABELS: Record<FellowshipInterest, string> = {
  [FellowshipInterest.SILENT_PAYMENT_LIBRARY]: 'Silent Payment Library',
  [FellowshipInterest.SILENT_PAYMENT_INDEXER]: 'Silent Payment Indexer',
  [FellowshipInterest.COINSELECTION]: 'Coin Selection',
  [FellowshipInterest.BITCOIN_CORE_REVIEW]: 'Bitcoin Core Review',
  [FellowshipInterest.COINSWAP]: 'Coinswap',
  [FellowshipInterest.ANY_OTHER_PROJECT]: 'Any Other Project',
};

const ALL_COMPONENTS = Object.values(CohortComponent);
const ALL_RATINGS = Object.values(ComponentRating);
const ALL_OPPORTUNITIES = Object.values(OpportunityInterest);
const ALL_FELLOWSHIPS = Object.values(FellowshipInterest);

const CohortFeedbackForm = ({ cohorts, isLoading, onSubmit }: Props) => {
  const navigate = useNavigate();
  const [selectedCohortId, setSelectedCohortId] = useState('');
  const [componentRatings, setComponentRatings] = useState<Partial<Record<CohortComponent, ComponentRating>>>({});
  const [expectations, setExpectations] = useState('');
  const [improvements, setImprovements] = useState('');
  const [opportunityInterests, setOpportunityInterests] = useState<OpportunityInterest[]>([]);
  const [fellowshipInterests, setFellowshipInterests] = useState<FellowshipInterest[]>([]);
  const [idealProject, setIdealProject] = useState('');
  const [testimonial, setTestimonial] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRatingChange = (component: CohortComponent, rating: ComponentRating) => {
    setComponentRatings(prev => ({ ...prev, [component]: rating }));
  };

  const toggleOpportunity = (item: OpportunityInterest) => {
    setOpportunityInterests(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const toggleFellowship = (item: FellowshipInterest) => {
    setFellowshipInterests(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        cohortId: selectedCohortId,
        componentRatings,
        expectations,
        improvements,
        opportunityInterests,
        fellowshipInterests,
        idealProject,
        testimonial,
      });
      setSelectedCohortId('');
      setComponentRatings({});
      setExpectations('');
      setImprovements('');
      setOpportunityInterests([]);
      setFellowshipInterests([]);
      setIdealProject('');
      setTestimonial('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Cohort Selector */}
      <div className="bg-zinc-800/50 backdrop-blur-sm rounded-2xl p-6 border border-zinc-700/50 space-y-4 ">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">Share Your Feedback</h2>
          <p className="text-zinc-400 text-sm mt-1">Help us improve by sharing your thoughts about your cohort experience</p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-zinc-300">
            Select Cohort <span className="text-red-400">*</span>
          </label>
          {isLoading ? (
            <div className="px-4 py-3 bg-zinc-700/50 rounded-lg text-zinc-400">Loading your cohorts...</div>
          ) : cohorts.length > 0 ? (
            <select
              value={selectedCohortId}
              onChange={e => setSelectedCohortId(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-700/50 border border-zinc-600 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              required
            >
              <option value="" className="bg-zinc-800">Choose a cohort...</option>
              {cohorts.map(cohort => (
                <option key={cohort.id} value={cohort.id} className="bg-zinc-800">
                  {cohort.type.replace(/_/g, ' ')} — Season {cohort.season}
                </option>
              ))}
            </select>
          ) : (
            <div className="text-zinc-400">
              You are not enrolled in any cohorts.{' '}
              <button type="button" onClick={() => navigate('/myDashboard')} className="bg-transparent b-0 text-white hover:underline">
                Join a cohort
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Component Ratings */}
      <div className="bg-zinc-800/50 backdrop-blur-sm rounded-2xl p-6 border border-zinc-700/50 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">Component Ratings</h3>
          <p className="text-sm text-zinc-400 mt-1">How helpful were the following components?</p>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left py-2 pr-6 text-zinc-500 font-medium text-xs uppercase tracking-wide w-2/5"></th>
                {ALL_RATINGS.map(rating => (
                  <th key={rating} className="text-center py-2 px-3 text-zinc-400 font-medium text-xs">
                    {RATING_LABELS[rating]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_COMPONENTS.map((component, i) => (
                <tr key={component} className={i % 2 === 0 ? 'bg-zinc-700/20 rounded' : ''}>
                  <td className="py-3 pr-6 text-zinc-300 text-sm">{COMPONENT_LABELS[component]}</td>
                  {ALL_RATINGS.map(rating => (
                    <td key={rating} className="py-3 px-3 text-center">
                      <input
                        type="radio"
                        name={`rating-${component}`}
                        checked={componentRatings[component] === rating}
                        onChange={() => handleRatingChange(component, rating)}
                        className="w-4 h-4 accent-blue-500 cursor-pointer"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile stack */}
        <div className="md:hidden space-y-5">
          {ALL_COMPONENTS.map(component => (
            <div key={component} className="space-y-2">
              <p className="text-sm font-medium text-zinc-300">{COMPONENT_LABELS[component]}</p>
              <div className="grid grid-cols-2 gap-2">
                {ALL_RATINGS.map(rating => (
                  <label
                    key={rating}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                      componentRatings[component] === rating
                        ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                        : 'border-zinc-600 text-zinc-400 hover:border-zinc-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`mobile-rating-${component}`}
                      checked={componentRatings[component] === rating}
                      onChange={() => handleRatingChange(component, rating)}
                      className="sr-only"
                    />
                    <span className="text-xs">{RATING_LABELS[rating]}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Open-ended questions */}
      <div className="bg-zinc-800/50 backdrop-blur-sm rounded-2xl p-6 border border-zinc-700/50 space-y-5">
        <h3 className="text-lg font-semibold text-zinc-100">Your Experience</h3>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-zinc-300 ">
            Did the cohort meet your expectations? What were they?
          </label>
          <textarea
            value={expectations}
            onChange={e => setExpectations(e.target.value)}
            rows={3}
            className="w-[96%] px-4 py-3 outline-none bg-zinc-700/50 border border-zinc-600 rounded-lg text-zinc-100 placeholder-zinc-500 transition-all resize-none"
            placeholder="Share your expectations and whether they were met..."
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-zinc-300">
            What could we improve?
          </label>
          <textarea
            value={improvements}
            onChange={e => setImprovements(e.target.value)}
            rows={3}
            className="w-[96%] px-4 py-3 outline-none bg-zinc-700/50 border border-zinc-600 rounded-lg text-zinc-100 placeholder-zinc-500 transition-all resize-none"
            placeholder="Suggest areas for improvement..."
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-zinc-300">
            What is your ideal Bitcoin project?
          </label>
          <textarea
            value={idealProject}
            onChange={e => setIdealProject(e.target.value)}
            rows={3}
            className="w-[96%] px-4 py-3 outline-none bg-zinc-700/50 border border-zinc-600 rounded-lg text-zinc-100 placeholder-zinc-500 transition-all resize-none"
            placeholder="Describe the Bitcoin project you'd love to work on..."
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-zinc-300">
            Testimonial
          </label>
          <textarea
            value={testimonial}
            onChange={e => setTestimonial(e.target.value)}
            rows={3}
            className="w-[96%] px-4 py-3 outline-none bg-zinc-700/50 border border-zinc-600 rounded-lg text-zinc-100 placeholder-zinc-500 transition-all resize-none"
            placeholder="Share a testimonial about your experience (may be featured publicly)..."
          />
        </div>
      </div>

      {/* Opportunity Interests */}
      <div className="bg-zinc-800/50 backdrop-blur-sm rounded-2xl p-6 border border-zinc-700/50 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">Opportunity Interests</h3>
          <p className="text-sm text-zinc-400 mt-1">What opportunities are you interested in pursuing?</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ALL_OPPORTUNITIES.map(item => (
            <label
              key={item}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all ${
                opportunityInterests.includes(item)
                  ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                  : 'border-zinc-600 text-zinc-400 hover:border-zinc-500'
              }`}
            >
              <input
                type="checkbox"
                checked={opportunityInterests.includes(item)}
                onChange={() => toggleOpportunity(item)}
                className="w-4 h-4 accent-blue-500 cursor-pointer"
              />
              <span className="text-sm">{OPPORTUNITY_LABELS[item]}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Fellowship Interests */}
      <div className="bg-zinc-800/50 backdrop-blur-sm rounded-2xl p-6 border border-zinc-700/50 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">Fellowship Interests</h3>
          <p className="text-sm text-zinc-400 mt-1">Which fellowship projects interest you?</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ALL_FELLOWSHIPS.map(item => (
            <label
              key={item}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all ${
                fellowshipInterests.includes(item)
                  ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                  : 'border-zinc-600 text-zinc-400 hover:border-zinc-500'
              }`}
            >
              <input
                type="checkbox"
                checked={fellowshipInterests.includes(item)}
                onChange={() => toggleFellowship(item)}
                className="w-4 h-4 accent-blue-500 cursor-pointer"
              />
              <span className="text-sm">{FELLOWSHIP_LABELS[item]}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !selectedCohortId}
        className="w-full b-0 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 hover:scale-[1.01] disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Submitting...
          </span>
        ) : 'Submit Feedback'}
      </button>
    </form>
  );
};

export default CohortFeedbackForm;
