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
    const [confirmationModal, setConfirmationModal] = useState<{
        show: boolean;
        cohortId: string;
        cohortName: string;
        isWaitlist: boolean;
        cohortType?: CohortType;
    }>({
        show: false,
        cohortId: '',
        cohortName: '',
        isWaitlist: false,
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
    const filteredCohorts = allCohortsData?.records
        ?.filter((cohort) => isCohortActive(cohort.endDate))
        ?.filter((cohort) => !myCohorts.some((myCohort) => myCohort.id === cohort.id)) || [];

    // If a newer season has registration open, hide older seasons with waitlist only
    const availableCohorts = filteredCohorts.filter((cohort) => {
        const registrationOpen = isRegistrationOpen(cohort.registrationDeadline);

        // If registration is open, always show this cohort
        if (registrationOpen) return true;

        // If registration is closed (waitlist only), check if there's a newer season with open registration
        const hasNewerSeasonWithOpenRegistration = filteredCohorts.some(
            (otherCohort) =>
                otherCohort.type === cohort.type &&
                otherCohort.season > cohort.season &&
                isRegistrationOpen(otherCohort.registrationDeadline)
        );

        // Hide this cohort if a newer season with open registration exists
        return !hasNewerSeasonWithOpenRegistration;
    });

    const hasAnyCohorts = myCohorts.length > 0 || availableCohorts.length > 0;

    const handleJoinCohort = (cohortId: string, cohortName: string) => {
        // Check if user profile is complete
        if (!isProfileComplete(userData)) {
            navigate('/me', { state: { showEmailPopup: true } });
            return;
        }

        // Show confirmation modal
        setConfirmationModal({
            show: true,
            cohortId,
            cohortName,
            isWaitlist: false,
        });
    };

    const handleJoinWaitlist = (cohortId: string, cohortType: CohortType) => {
        // Check if user profile is complete
        if (!isProfileComplete(userData)) {
            navigate('/me', { state: { showEmailPopup: true } });
            return;
        }

        // Show confirmation modal
        setConfirmationModal({
            show: true,
            cohortId,
            cohortName: formatCohortType(cohortType),
            isWaitlist: true,
            cohortType,
        });
    };

    const confirmJoinCohort = () => {
        const { cohortId, cohortName, isWaitlist, cohortType } = confirmationModal;
        setConfirmationModal({ show: false, cohortId: '', cohortName: '', isWaitlist: false });
        setLoadingCohortId(cohortId);

        if (isWaitlist && cohortType) {
            joinWaitlist(
                { type: cohortType },
                {
                    onSuccess: () => {
                        setLoadingCohortId(null);
                        setNotification({
                            show: true,
                            message: `Successfully joined the waitlist for ${cohortName}!`,
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
        } else {
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
        }
    };

    const cancelJoinCohort = () => {
        setConfirmationModal({ show: false, cohortId: '', cohortName: '', isWaitlist: false });
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

        {/* Confirmation Modal */}
        {confirmationModal.show && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                <div className="bg-zinc-800 rounded-lg p-6 max-w-md w-full mx-4 border border-zinc-700">
                    <h3 className="text-xl font-bold text-white mb-4">
                        {confirmationModal.isWaitlist ? 'Join Waitlist' : 'Join Cohort'}
                    </h3>
                    <p className="text-zinc-300 mb-6">
                        {confirmationModal.isWaitlist
                            ? `Are you sure you want to join the waitlist for ${confirmationModal.cohortName}?`
                            : `Are you sure you want to join the ${confirmationModal.cohortName} cohort?`}
                    </p>
                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={cancelJoinCohort}
                            className="px-4 py-2 bg-zinc-700 text-white rounded hover:bg-zinc-600 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmJoinCohort}
                            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                        >
                            {confirmationModal.isWaitlist ? 'Join Waitlist' : 'Join Cohort'}
                        </button>
                    </div>
                </div>
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