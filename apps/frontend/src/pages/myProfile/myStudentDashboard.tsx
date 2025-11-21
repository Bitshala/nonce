import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMyCohorts, useCohorts, useJoinCohort, useJoinCohortWaitlist } from '../../hooks/cohortHooks';
import { useUser } from '../../hooks/userHooks';
import { CohortType } from '../../types/enums';
import type { GetUserResponse } from '../../types/api';

const getCohortImage = (cohortType: string): string => {
    const imageMap: Record<string, string> = {
        'MASTERING_BITCOIN': 'https://bitshala.org/cohort/mb.webp',
        'LEARNING_BITCOIN_FROM_COMMAND_LINE': 'https://bitshala.org/cohort/lbtcl.webp',
        'BITCOIN_PROTOCOL_DEVELOPMENT': 'https://bitshala.org/cohort/bpd.webp',
        'PROGRAMMING_BITCOIN': 'https://bitshala.org/cohort/pb.webp',
    };
    return imageMap[cohortType] || 'https://bitshala.org/cohort/mb.webp';
};

const isProfileComplete = (userData: GetUserResponse | undefined): boolean => {
    if (!userData) return false;

    // Check all required profile fields
    return !!(
        userData.email &&
        userData.name &&
        userData.description &&
        userData.background &&
        userData.githubProfileUrl &&
        userData.skills && userData.skills.length > 0 &&
        userData.firstHeardAboutBitcoinOn &&
        userData.bitcoinBooksRead && userData.bitcoinBooksRead.length > 0 &&
        userData.whyBitcoin &&
        userData.weeklyCohortCommitmentHours &&
        userData.location
    );
};

const MyStudentDashboard = () => {
    const navigate = useNavigate();
    const { data, isLoading } = useMyCohorts({ page: 0, pageSize: 100 });
    const { data: allCohortsData } = useCohorts({ page: 0, pageSize: 100 });
    const { mutate: joinCohort } = useJoinCohort();
    const { mutate: joinWaitlist } = useJoinCohortWaitlist();
    const { data: userData } = useUser();

    const [loadingCohortId, setLoadingCohortId] = useState<string | null>(null);
    const [popup, setPopup] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
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

    const isRegistrationOpen = (registrationDeadline: string): boolean => {
        const now = new Date();
        const deadline = new Date(registrationDeadline);
        return now <= deadline;
    };

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
                    setPopup({
                        show: true,
                        message: `Successfully joined ${cohortName} cohort!`,
                        type: 'success',
                    });
                },
                onError: (error: unknown) => {
                    setLoadingCohortId(null);
                    let errorMessage = 'An error occurred';
                    if (typeof error === 'object' && error !== null && 'response' in error) {
                        const responseError = error as { response?: { data?: { message?: string; errorId?: string } } };
                        if (responseError.response?.data?.message) {
                            errorMessage = responseError.response.data.message;
                            if (responseError.response.data.errorId) {
                                errorMessage += ` (Error ID: ${responseError.response.data.errorId})`;
                            }
                        }
                    } else if (error instanceof Error) {
                        errorMessage = error.message;
                    }
                    setPopup({
                        show: true,
                        message: errorMessage,
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
                    setPopup({
                        show: true,
                        message: `Successfully joined the waitlist for ${cohortType.replace(/_/g, ' ')}!`,
                        type: 'success',
                    });
                },
                onError: (error) => {
                    setLoadingCohortId(null);
                    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
                    setPopup({
                        show: true,
                        message: `Failed to join waitlist: ${errorMessage}`,
                        type: 'error',
                    });
                },
            }
        );
    };

    const closePopup = () => {
        setPopup({ show: false, message: '', type: 'success' });
    };

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 px-8 py-6" style={{ fontFamily: 'Sora, sans-serif' }}>
        <header className="flex justify-between items-center mb-6">
            <div>
                <h1 className="text-4xl font-bold">My Student Dashboard</h1>
            </div>
            <div
                className="h-16 w-16 rounded-full flex items-center justify-center p-2 cursor-pointer hover:ring-2 hover:ring-zinc-500 transition-all"
                onClick={() => navigate('/me')}
            >
               <img src="https://api.dicebear.com/9.x/adventurer/svg?seed=O" className="w-full h-full contain " alt="avatar" />
            </div>
        </header>
        <div className="flex flex-col gap-6">
            <div>
            <h1 className="text-3xl font-bold mb-4">Available Cohorts</h1>
                <div className="grid grid-cols-4 gap-4">
                    {allCohortsData?.records
                        ?.filter((cohort) => {
                            const now = new Date();
                            const endDate = new Date(cohort.endDate);
                            return now <= endDate; // Only show cohorts that haven't ended
                        })
                        .map((cohort) => {
                            const registrationOpen = isRegistrationOpen(cohort.registrationDeadline);
                            const isLoading = loadingCohortId === cohort.id;
                            const isEnrolled = myCohorts.some((myCohort) => myCohort.id === cohort.id);
                            return (
                                <div
                                    key={cohort.id}
                                    className={`h-[180px] w-[320px] rounded-sm overflow-hidden relative transform transition-all duration-300 ${
                                        isLoading ? 'cursor-wait opacity-75' : isEnrolled ? 'cursor-default' : 'hover:scale-105 hover:shadow-lg cursor-pointer'
                                    }`}
                                    onClick={() => {
                                        if (isLoading || isEnrolled) return;
                                        if (registrationOpen) {
                                            handleJoinCohort(cohort.id, cohort.type.replace(/_/g, ' '));
                                        } else {
                                            handleJoinWaitlist(cohort.id, cohort.type as CohortType);
                                        }
                                    }}
                                >
                                    <img src={getCohortImage(cohort.type)} alt={cohort.type} className="w-full h-full object-contain" />
                                    <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center">
                                        {isLoading ? (
                                            <div className="flex items-center gap-2">
                                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <span className="text-white font-semibold text-lg">Loading...</span>
                                            </div>
                                        ) : (
                                            <span className="text-white font-semibold text-lg">
                                                {isEnrolled ? 'Enrolled' : registrationOpen ? 'Join Cohort' : 'Join the waitlist'}
                                            </span>
                                        )}
                                    </div>
                                </div>
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
                            <div
                                key={cohort.id}
                                className="h-[180px] w-[320px] rounded-sm overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-lg"
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
                            >
                                <img
                                    src={getCohortImage(cohort.type)}
                                    alt={cohort.type}
                                    className="w-full h-full object-contain"
                                />
                            </div>
                        ))
                    )}

                </div>
            </div>
        </div>

        {/* Modern Popup Modal */}
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

export default MyStudentDashboard;