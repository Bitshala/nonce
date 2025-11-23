import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMyCohorts, useCohorts, useJoinCohort, useJoinCohortWaitlist } from '../../hooks/cohortHooks';
import { useUser } from '../../hooks/userHooks';
import { CohortType } from '../../types/enums';
import NotificationModal from '../../components/NotificationModal';
import CohortCard from '../../components/dashboard/CohortCard';
import { getCohortImage, isRegistrationOpen, isCohortActive, formatCohortType } from '../../utils/cohortUtils';
import { isProfileComplete } from '../../utils/userUtils';
import { extractErrorMessage } from '../../utils/errorUtils';
import type { NotificationState } from '../../types/feedback';

const MyStudentDashboard = () => {
    const navigate = useNavigate();
    const { data, isLoading } = useMyCohorts({ page: 0, pageSize: 100 });
    const { data: allCohortsData } = useCohorts({ page: 0, pageSize: 100 });
    const { mutate: joinCohort } = useJoinCohort();
    const { mutate: joinWaitlist } = useJoinCohortWaitlist();
    const { data: userData } = useUser();

    const [loadingCohortId, setLoadingCohortId] = useState<string | null>(null);
    const [notification, setNotification] = useState<NotificationState>({
        show: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        if (allCohortsData) {
            console.log('All Available Cohorts:', allCohortsData);
            console.log('Cohort Records:', allCohortsData.records);
        }
    }, [allCohortsData]);

    useEffect(() => {
        if (data) {
            console.log('My Cohorts (Joined):', data);
            console.log('My Cohort Records:', data.records);
        }
    }, [data]);

    const myCohorts = data?.records || [];

    const handleJoinCohort = (cohortId: string, cohortName: string) => {
        // Check if user profile is complete
        if (!isProfileComplete(userData)) {
            navigate('/me', { state: { showEmailPopup: true } });
            return;
        }

        setLoadingCohortId(cohortId);
        joinCohort(
            { cohortId },
            {
                onSuccess: () => {
                    setLoadingCohortId(null);
                    setNotification({
                        show: true,
                        message: `Successfully joined ${cohortName} cohort!`,
                        type: 'success',
                    });
                },
                onError: (error: unknown) => {
                    setLoadingCohortId(null);
                    setNotification({
                        show: true,
                        message: extractErrorMessage(error),
                        type: 'error',
                    });
                },
            }
        );
    };

    const handleJoinWaitlist = (cohortId: string, cohortType: CohortType) => {
        // Check if user profile is complete
        if (!isProfileComplete(userData)) {
            navigate('/me', { state: { showEmailPopup: true } });
            return;
        }

        setLoadingCohortId(cohortId);
        joinWaitlist(
            { type: cohortType },
            {
                onSuccess: () => {
                    setLoadingCohortId(null);
                    setNotification({
                        show: true,
                        message: `Successfully joined the waitlist for ${formatCohortType(cohortType)}!`,
                        type: 'success',
                    });
                },
                onError: (error) => {
                    setLoadingCohortId(null);
                    setNotification({
                        show: true,
                        message: `Failed to join waitlist: ${extractErrorMessage(error)}`,
                        type: 'error',
                    });
                },
            }
        );
    };

    const closeNotification = () => {
        setNotification({ show: false, message: '', type: 'success' });
    };

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 px-8 py-6" style={{ fontFamily: 'Sora, sans-serif' }}>
        <header className="flex justify-between items-center mb-6">
            <div>
                <h1 className="text-4xl font-bold">My Student Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/cohortfeedback')}
                    className="b-0 bg-transparent text-white font-semibold px-6 py-3 transition-all duration-200 hover:scale-105 "
                >
                    Share Feedback
                </button>
                <div
                    className="h-16 w-16 rounded-full flex items-center justify-center p-2 cursor-pointer hover:ring-2 hover:ring-zinc-500 transition-all"
                    onClick={() => navigate('/me')}
                >
                   <img src="https://api.dicebear.com/9.x/adventurer/svg?seed=O" className="w-full h-full contain " alt="avatar" />
                </div>
            </div>
        </header>
        <div className="flex flex-col gap-6">
            <div>
            <h1 className="text-3xl font-bold mb-4">Available Cohorts</h1>
                <div className="grid grid-cols-4 gap-4">
                    {allCohortsData?.records
                        ?.filter((cohort) => isCohortActive(cohort.endDate))
                        .map((cohort) => {
                            const registrationOpen = isRegistrationOpen(cohort.registrationDeadline);
                            const isLoading = loadingCohortId === cohort.id;
                            const isEnrolled = myCohorts.some((myCohort) => myCohort.id === cohort.id);
                            return (
                                <CohortCard
                                    key={cohort.id}
                                    cohortId={cohort.id}
                                    cohortType={cohort.type}
                                    imageUrl={getCohortImage(cohort.type)}
                                    isLoading={isLoading}
                                    isEnrolled={isEnrolled}
                                    registrationOpen={registrationOpen}
                                    onClick={() => {
                                        if (registrationOpen) {
                                            handleJoinCohort(cohort.id, formatCohortType(cohort.type));
                                        } else {
                                            handleJoinWaitlist(cohort.id, cohort.type as CohortType);
                                        }
                                    }}
                                />
                            );
                        })}
                </div>
            </div>
              <div>
                             <h1 className="text-3xl font-bold mb-4">My Active Cohorts</h1>
            <div className="grid grid-cols-4 gap-4">
                    {isLoading ? (
                        <div className="text-zinc-400">Loading cohorts...</div>
                    ) : myCohorts.length === 0 ? (
                        <div className="text-zinc-400">No cohorts joined yet</div>
                    ) : (
                        myCohorts.map((cohort) => (
                            <CohortCard
                                key={cohort.id}
                                cohortId={cohort.id}
                                cohortType={cohort.type}
                                imageUrl={getCohortImage(cohort.type)}
                                isEnrolled={true}
                                onClick={() => {
                                    if (userData?.id) {
                                        const params = new URLSearchParams({
                                            studentId: userData.id,
                                            cohortType: cohort.type,
                                            cohortId: cohort.id,
                                            ...(userData.name && { studentName: userData.name }),
                                            ...(userData.email && { studentEmail: userData.email }),
                                        });
                                        navigate(`/detailPage?${params.toString()}`);
                                    }
                                }}
                            />
                        ))
                    )}

                </div>
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

export default MyStudentDashboard;