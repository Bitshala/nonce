import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMyCohorts, useCohorts, useJoinCohort, useJoinCohortWaitlist } from '../../hooks/cohortHooks';
import { useUser } from '../../hooks/userHooks';
import { CohortType } from '../../types/enums';
import NotificationModal from '../../components/NotificationModal';
import CohortCardV2 from '../../components/dashboard/CohortCardV2';
import { getCohortImage, isRegistrationOpen, isCohortActive, formatCohortType } from '../../utils/cohortUtils';
import { isProfileComplete } from '../../utils/userUtils';
import { extractErrorMessage } from '../../utils/errorUtils';
import { cohortTypeToName } from '../../helpers/cohortHelpers';
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

    // Filter out cohorts that the user is already enrolled in
    const availableCohorts = allCohortsData?.records
        ?.filter((cohort) => isCohortActive(cohort.endDate))
        ?.filter((cohort) => !myCohorts.some((myCohort) => myCohort.id === cohort.id)) || [];

    const hasAnyCohorts = myCohorts.length > 0 || availableCohorts.length > 0;

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

        {isLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-zinc-400">Loading cohorts...</div>
            </div>
        ) : !hasAnyCohorts ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <h2 className="text-2xl font-bold text-zinc-400 mb-2">No Cohorts Available</h2>
                <p className="text-zinc-500">There are currently no cohorts to join or show data of.</p>
            </div>
        ) : (
            <div className="flex flex-col gap-6">
                {/* Available Cohorts Section - Only show if there are available cohorts */}
                {availableCohorts.length > 0 && (
                    <div>
                        <h1 className="text-3xl font-bold mb-4">Available Cohorts</h1>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {availableCohorts.map((cohort) => {
                                const registrationOpen = isRegistrationOpen(cohort.registrationDeadline);
                                const isLoadingCohort = loadingCohortId === cohort.id;
                                return (
                                    <CohortCardV2
                                        key={cohort.id}
                                        cohortType={cohort.type}
                                        cohortDisplayName={cohortTypeToName(cohort.type as CohortType)}
                                        imageUrl={getCohortImage(cohort.type)}
                                        isLoading={isLoadingCohort}
                                        registrationOpen={registrationOpen}
                                        season={cohort.season}
                                        variant="desktop"
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
                )}

                {/* My Active Cohorts Section - Only show if there are enrolled cohorts */}
                {myCohorts.length > 0 && (
                    <div>
                        <h1 className="text-3xl font-bold mb-4">My Active Cohorts</h1>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {myCohorts.map((cohort) => (
                                <CohortCardV2
                                    key={cohort.id}
                                    cohortType={cohort.type}
                                    cohortDisplayName={cohortTypeToName(cohort.type as CohortType)}
                                    imageUrl={getCohortImage(cohort.type)}
                                    isEnrolled={true}
                                    season={cohort.season}
                                    variant="desktop"
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
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}

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