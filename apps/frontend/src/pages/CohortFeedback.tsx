import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMyCohorts } from '../hooks/cohortHooks';
import { useUser } from '../hooks/userHooks';

const CohortFeedback = () => {
    const navigate = useNavigate();
    const { data: cohortsData, isLoading } = useMyCohorts({ page: 0, pageSize: 100 });
    const { data: userData } = useUser();

    const [selectedCohortId, setSelectedCohortId] = useState<string>('');
    const [feedback, setFeedback] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [popup, setPopup] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
        show: false,
        message: '',
        type: 'success',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedCohortId) {
            setPopup({
                show: true,
                message: 'Please select a cohort',
                type: 'error',
            });
            return;
        }

        if (!feedback.trim()) {
            setPopup({
                show: true,
                message: 'Please provide feedback',
                type: 'error',
            });
            return;
        }

        setIsSubmitting(true);

        try {
            // TODO: Replace with actual API call when available
            // await apiService.submitCohortFeedback({ cohortId: selectedCohortId, feedback, userId: userData?.id });

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            setPopup({
                show: true,
                message: 'Feedback submitted successfully!',
                type: 'success',
            });

            // Reset form
            setSelectedCohortId('');
            setFeedback('');
        } catch (error) {
            setPopup({
                show: true,
                message: 'Failed to submit feedback. Please try again.',
                type: 'error',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const closePopup = () => {
        setPopup({ show: false, message: '', type: 'success' });
    };

    return (
        <div className="min-h-screen bg-zinc-900 text-zinc-100 flex flex-col" style={{ fontFamily: 'Sora, sans-serif' }}>
            {/* Header */}
            <header className="px-8 py-6 flex justify-between items-center border-b border-zinc-800">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/myDashboard')}
                        className="bg-transparent b-0 text-zinc-400 hover:text-zinc-100 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <h1 className="text-3xl font-bold">Cohort Feedback</h1>
                </div>
                <div
                    className="h-12 w-12 rounded-full flex items-center justify-center p-2 cursor-pointer hover:ring-2 hover:ring-zinc-500 transition-all"
                    onClick={() => navigate('/me')}
                >
                    <img src="https://api.dicebear.com/9.x/adventurer/svg?seed=O" className="w-full h-full contain" alt="avatar" />
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center px-8 py-12">
                <div className="w-full max-w-2xl">
                    <form onSubmit={handleSubmit} className="bg-zinc-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-8 space-y-6 border border-zinc-700/50">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-zinc-100 mb-2">Share Your Feedback</h2>
                            <p className="text-zinc-400">Help us improve by sharing your thoughts about your cohort experience</p>
                        </div>

                        {/* Cohort Selector */}
                        <div className="space-y-2">
                            <label htmlFor="cohort" className="block text-sm font-semibold text-zinc-300">
                                Select Cohort <span className="text-red-400">*</span>
                            </label>
                            {isLoading ? (
                                <div className=" px-4 py-3 bg-zinc-700/50 rounded-lg text-zinc-400">
                                    Loading your cohorts...
                                </div>
                            ) : cohortsData?.records && cohortsData.records.length > 0 ? (
                                <select
                                    id="cohort"
                                    value={selectedCohortId}
                                    onChange={(e) => setSelectedCohortId(e.target.value)}
                                    className=" px-4 py-3 bg-zinc-700/50 border border-zinc-600 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                                    required
                                >
                                    <option value="" className="bg-zinc-800">Choose a cohort...</option>
                                    {cohortsData.records.map((cohort) => (
                                        <option key={cohort.id} value={cohort.id} className="bg-zinc-800">
                                            {cohort.type.replace(/_/g, ' ')} - {new Date(cohort.startDate).toLocaleDateString()}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <div className="w-full px-4 py-3 bg-zinc-700/50 rounded-lg text-zinc-400">
                                    You are not enrolled in any cohorts yet. <button type="button" onClick={() => navigate('/myDashboard')} className="text-blue-400 hover:underline">Join a cohort</button>
                                </div>
                            )}
                        </div>

                        {/* Feedback Textarea */}
                        <div className="space-y-2">
                            <label htmlFor="feedback" className="block text-sm font-semibold text-zinc-300">
                                Your Feedback <span className="text-red-400">*</span>
                            </label>
                            <textarea
                                id="feedback"
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                rows={8}
                                className="w-[578px] px-4 py-3 bg-zinc-700/50 border border-zinc-600 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                                placeholder="Share your thoughts, suggestions, or experiences..."
                                required
                            />
                            <p className="text-xs text-zinc-500">{feedback.length} characters</p>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting || !selectedCohortId || !feedback.trim()}
                            className="b-0 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 hover:scale-[1.02] disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-800"
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
                </div>
            </div>

            {/* Popup Modal */}
            {popup.show && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300">
                    <div className="bg-zinc-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all duration-300 scale-100">
                        <div className="flex flex-col items-center text-center">
                            {popup.type === 'success' ? (
                                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            ) : (
                                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                                    <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </div>
                            )}
                            <h3 className="text-2xl font-bold text-zinc-100 mb-2">
                                {popup.type === 'success' ? 'Success!' : 'Error'}
                            </h3>
                            <p className="text-zinc-300 mb-6">{popup.message}</p>
                            <button
                                onClick={closePopup}
                                className="border-none bg-zinc-700 hover:bg-zinc-600 text-zinc-100 font-semibold px-8 py-3 rounded-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CohortFeedback;
