import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMyCohorts } from '../hooks/cohortHooks';
import NotificationModal from '../components/NotificationModal';
import CohortFeedbackForm from '../components/CohortFeedbackForm';
import type { NotificationState, FeedbackFormData } from '../types/feedback';

const CohortFeedback = () => {
    const navigate = useNavigate();
    const { data: cohortsData, isLoading } = useMyCohorts({ page: 0, pageSize: 100 });

    const [notification, setNotification] = useState<NotificationState>({
        show: false,
        message: '',
        type: 'success',
    });

    const handleSubmit = async (data: FeedbackFormData) => {
        if (!data.cohortId) {
            setNotification({
                show: true,
                message: 'Please select a cohort',
                type: 'error',
            });
            throw new Error('Cohort not selected');
        }

        if (!data.feedback.trim()) {
            setNotification({
                show: true,
                message: 'Please provide feedback',
                type: 'error',
            });
            throw new Error('Feedback is empty');
        }

        try {
            // TODO: Replace with actual API call when available
            // await apiService.submitCohortFeedback({ cohortId: data.cohortId, feedback: data.feedback, userId: userData?.id });

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            setNotification({
                show: true,
                message: 'Feedback submitted successfully!',
                type: 'success',
            });
        } catch (error) {
            setNotification({
                show: true,
                message: 'Failed to submit feedback. Please try again.',
                type: 'error',
            });
            throw error;
        }
    };

    const closeNotification = () => {
        setNotification({ show: false, message: '', type: 'success' });
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
                    <CohortFeedbackForm
                        cohorts={cohortsData?.records || []}
                        isLoading={isLoading}
                        onSubmit={handleSubmit}
                    />
                </div>
            </div>

            {/* Notification Modal */}
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
