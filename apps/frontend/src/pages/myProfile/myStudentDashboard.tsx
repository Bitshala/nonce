import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMyCohorts, useCohorts, useJoinCohort, useJoinCohortWaitlist, useMyWaitlistStatus } from '../../hooks/cohortHooks';
import { useUser } from '../../hooks/userHooks';
import { CohortType } from '../../types/enums';

const getCohortImage = (cohortType: string): string => {
    const imageMap: Record<string, string> = {
        'MASTERING_BITCOIN': 'https://bitshala.org/cohort/mb.webp',
        'LEARNING_BITCOIN_FROM_COMMAND_LINE': 'https://bitshala.org/cohort/lbtcl.webp',
        'BITCOIN_PROTOCOL_DEVELOPMENT': 'https://bitshala.org/cohort/bpd.webp',
        'PROGRAMMING_BITCOIN': 'https://bitshala.org/cohort/pb.webp',
    };
    return imageMap[cohortType] || 'https://bitshala.org/cohort/mb.webp';
};

const MyStudentDashboard = () => {
    const navigate = useNavigate();
    const { data, isLoading } = useMyCohorts({ page: 0, pageSize: 100 });
    const { data: allCohortsData } = useCohorts({ page: 0, pageSize: 100 });
    const { mutate: joinCohort } = useJoinCohort();
    const { mutate: joinWaitlist } = useJoinCohortWaitlist();
    const { data: waitlistData } = useMyWaitlistStatus();
    const { data: userData } = useUser();

    const [popup, setPopup] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
        show: false,
        message: '',
        type: 'success',
    });

    const activeCohorts = data?.records?.filter((cohort) => {
        const now = new Date();
        const startDate = new Date(cohort.startDate);
        const endDate = new Date(cohort.endDate);
        return now >= startDate && now <= endDate;
    }) || [];

    const isWaitlisted = (cohortType: CohortType): boolean => {
        return waitlistData?.cohortWaitlist?.includes(cohortType) || false;
    };

    const getMasteringBitcoinCohortId = (): string | null => {
        const masteringBitcoinCohort = allCohortsData?.records?.find(
            (cohort) => cohort.type === CohortType.MASTERING_BITCOIN
        );
        return masteringBitcoinCohort?.id || null;
    };

    const handleJoinMasteringBitcoin = () => {
        // Check if user email exists
        if (!userData?.email) {
            navigate('/me', { state: { showEmailPopup: true } });
            return;
        }

        const cohortId = getMasteringBitcoinCohortId();
        if (!cohortId) {
            setPopup({
                show: true,
                message: 'MASTERING BITCOIN cohort is not available at the moment.',
                type: 'error',
            });
            return;
        }

        joinCohort(
            { cohortId },
            {
                onSuccess: () => {
                    setPopup({
                        show: true,
                        message: 'Successfully joined MASTERING BITCOIN cohort!',
                        type: 'success',
                    });
                },
                onError: (error: unknown) => {
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

    const handleJoinWaitlist = (cohortType: CohortType) => {
        if (isWaitlisted(cohortType)) {
            return; // Already waitlisted, do nothing
        }

        // Check if user email exists
        if (!userData?.email) {
            navigate('/me', { state: { showEmailPopup: true } });
            return;
        }

        joinWaitlist(
            { type: cohortType },
            {
                onSuccess: () => {
                    setPopup({
                        show: true,
                        message: `Successfully joined the waitlist for ${cohortType.replace(/_/g, ' ')}!`,
                        type: 'success',
                    });
                },
                onError: (error) => {
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
                 <div
                        className="h-[180px] w-[320px] rounded-sm overflow-hidden relative transform transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer"
                        onClick={handleJoinMasteringBitcoin}
                    >
                        <img src="https://bitshala.org/cohort/mb.webp" alt="" className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center">
                            <span className="text-white font-semibold text-lg">
                                Join Cohort
                            </span>
                        </div>
                    </div>
                    <div
                        className={`h-[180px] w-[320px] rounded-sm overflow-hidden relative transform transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                            isWaitlisted(CohortType.LEARNING_BITCOIN_FROM_COMMAND_LINE) ? 'cursor-default' : 'cursor-pointer'
                        }`}
                        onClick={() => handleJoinWaitlist(CohortType.LEARNING_BITCOIN_FROM_COMMAND_LINE)}
                    >
                        <img src="https://bitshala.org/cohort/lbtcl.webp" alt="" className="w-full h-full object-contain" />
                        <div className={`absolute inset-0 ${isWaitlisted(CohortType.LEARNING_BITCOIN_FROM_COMMAND_LINE) ? 'bg-green-900/70' : 'bg-gray-900/70'} flex items-center justify-center`}>
                            <span className="text-white font-semibold text-lg">
                                {isWaitlisted(CohortType.LEARNING_BITCOIN_FROM_COMMAND_LINE) ? 'Waitlisted ✓' : 'Join the waitlist'}
                            </span>
                        </div>
                    </div>
                    <div
                        className={`h-[180px] w-[320px] rounded-sm overflow-hidden relative transform transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                            isWaitlisted(CohortType.BITCOIN_PROTOCOL_DEVELOPMENT) ? 'cursor-default' : 'cursor-pointer'
                        }`}
                        onClick={() => handleJoinWaitlist(CohortType.BITCOIN_PROTOCOL_DEVELOPMENT)}
                    >
                        <img src="https://bitshala.org/cohort/bpd.webp" alt="" className="w-full h-full object-contain" />
                        <div className={`absolute inset-0 ${isWaitlisted(CohortType.BITCOIN_PROTOCOL_DEVELOPMENT) ? 'bg-green-900/70' : 'bg-gray-900/70'} flex items-center justify-center`}>
                            <span className="text-white font-semibold text-lg">
                                {isWaitlisted(CohortType.BITCOIN_PROTOCOL_DEVELOPMENT) ? 'Waitlisted ✓' : 'Join the waitlist'}
                            </span>
                        </div>
                    </div>
                    <div
                        className={`h-[180px] w-[320px] rounded-sm overflow-hidden relative transform transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                            isWaitlisted(CohortType.PROGRAMMING_BITCOIN) ? 'cursor-default' : 'cursor-pointer'
                        }`}
                        onClick={() => handleJoinWaitlist(CohortType.PROGRAMMING_BITCOIN)}
                    >
                        <img src="https://bitshala.org/cohort/pb.webp" alt="" className="w-full h-full object-contain" />
                        <div className={`absolute inset-0 ${isWaitlisted(CohortType.PROGRAMMING_BITCOIN) ? 'bg-green-900/70' : 'bg-gray-900/70'} flex items-center justify-center`}>
                            <span className="text-white font-semibold text-lg">
                                {isWaitlisted(CohortType.PROGRAMMING_BITCOIN) ? 'Waitlisted ✓' : 'Join the waitlist'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
              <div>
                             <h1 className="text-3xl font-bold mb-4">My Active Cohorts</h1>
            <div className="grid grid-cols-4 gap-4">
                    {isLoading ? (
                        <div className="text-zinc-400">Loading active cohorts...</div>
                    ) : activeCohorts.length === 0 ? (
                        <div className="text-zinc-400">No active cohorts</div>
                    ) : (
                        activeCohorts.map((cohort) => (
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