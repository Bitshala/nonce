import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMyCohorts } from '../hooks/cohortHooks';
import { useSubmitFeedback } from '../hooks/feedbackHooks';
import { extractErrorMessage } from '../utils/errorUtils';
import NotificationModal from '../components/NotificationModal';
import CohortFeedbackForm from '../components/CohortFeedbackForm';
import type { NotificationState, FeedbackFormData } from '../types/feedback';

const CohortFeedback = () => {
    const navigate = useNavigate();
    const { data: cohortsData, isLoading } = useMyCohorts({ page: 0, pageSize: 100 });
    const submitFeedbackMutation = useSubmitFeedback();

    const [notification, setNotification] = useState<NotificationState>({
        show: false,
        message: '',
        type: 'success',
    });

    const handleSubmit = async (data: FeedbackFormData) => {
        if (!data.cohortId) {
            setNotification({ show: true, message: 'Please select a cohort', type: 'error' });
            throw new Error('Cohort not selected');
        }

        try {
            await submitFeedbackMutation.mutateAsync({
                cohortId: data.cohortId,
                body: {
                    componentRatings: Object.keys(data.componentRatings).length > 0 ? data.componentRatings : undefined,
                    expectations: data.expectations || undefined,
                    improvements: data.improvements || undefined,
                    opportunityInterests: data.opportunityInterests.length > 0 ? data.opportunityInterests : undefined,
                    fellowshipInterests: data.fellowshipInterests.length > 0 ? data.fellowshipInterests : undefined,
                    idealProject: data.idealProject || undefined,
                    testimonial: data.testimonial || undefined,
                },
            });

            setNotification({ show: true, message: 'Feedback submitted successfully!', type: 'success' });
        } catch (error) {
            setNotification({ show: true, message: extractErrorMessage(error), type: 'error' });
            throw error;
        }
    };

    const closeNotification = () => {
        setNotification({ show: false, message: '', type: 'success' });
    };

    return (
        <div className="min-h-screen bg-zinc-900 text-zinc-100 flex flex-col" style={{ fontFamily: 'Sora, sans-serif' }}>
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

            <div className="flex-1 px-8 py-10">
                <div className="max-w-4xl mx-auto">
                    <CohortFeedbackForm
                        cohorts={cohortsData?.records || []}
                        isLoading={isLoading}
                        onSubmit={handleSubmit}
                    />
                </div>
            </div>

            <NotificationModal
                show={notification.show}
                message={notification.message}
                type={notification.type}
                onClose={closeNotification}
            />
        </div>
    );
};

export default CohortFeedback;
