import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMyCohorts, useCohorts, useJoinCohort, useJoinCohortWaitlist } from '../../hooks/cohortHooks';
import { useUser } from '../../hooks/userHooks';
import { CohortType } from '../../types/enums';
import NotificationModal from '../../components/NotificationModal';
import Tabs from '../../components/ui/Tabs';
import CohortTable from '../../components/ui/CohortTable';
import type { CohortRow } from '../../components/ui/CohortTable';
import { isRegistrationOpen, isCohortActive, formatCohortType, computeStatus } from '../../utils/cohortUtils';
import { isProfileComplete } from '../../utils/userUtils';
import { extractErrorMessage } from '../../utils/errorUtils';
import { cohortTypeToName } from '../../helpers/cohortHelpers';
import type { NotificationState } from '../../types/feedback';

type DashboardCohortRow = CohortRow & {
  enrolled: boolean;
  registrationOpen?: boolean;
  cohortType?: CohortType;
};

const MyStudentDashboard = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useMyCohorts({ page: 0, pageSize: 100 });
  const { data: allCohortsData } = useCohorts({ page: 0, pageSize: 100 });
  const { mutate: joinCohort } = useJoinCohort();
  const { mutate: joinWaitlist } = useJoinCohortWaitlist();
  const { data: userData } = useUser();

  const [activeTab, setActiveTab] = useState<string>('Active');
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

  const myCohorts = data?.records || [];

  // Build available cohorts (same logic as before)
  const availableCohorts = useMemo(() => {
    const filtered =
      allCohortsData?.records
        ?.filter((cohort) => isCohortActive(cohort.endDate))
        ?.filter((cohort) => !myCohorts.some((mc) => mc.id === cohort.id)) || [];

    return filtered.filter((cohort) => {
      const registrationOpen = isRegistrationOpen(cohort.registrationDeadline);
      const enrolledInNewerSeason = myCohorts.some(
        (mc) => mc.type === cohort.type && mc.season > cohort.season,
      );
      if (enrolledInNewerSeason) return false;
      if (registrationOpen) return true;
      const hasNewerOpen = filtered.some(
        (other) =>
          other.type === cohort.type &&
          other.season > cohort.season &&
          isRegistrationOpen(other.registrationDeadline),
      );
      return !hasNewerOpen;
    });
  }, [allCohortsData, myCohorts]);

  // Map all cohorts to table rows
  const allRows: DashboardCohortRow[] = useMemo(() => {
    const enrolledRows: DashboardCohortRow[] = myCohorts.map((c) => ({
      id: c.id,
      name: cohortTypeToName(c.type as CohortType),
      type: c.type,
      season: c.season,
      status: computeStatus(c.startDate, c.endDate),
      startDate: c.startDate,
      endDate: c.endDate,
      enrolled: true,
      raw: c,
    }));

    const availableRows: DashboardCohortRow[] = availableCohorts.map((c) => ({
      id: c.id,
      name: cohortTypeToName(c.type as CohortType),
      type: c.type,
      season: c.season,
      status: computeStatus(c.startDate, c.endDate),
      startDate: c.startDate,
      endDate: c.endDate,
      enrolled: false,
      registrationOpen: isRegistrationOpen(c.registrationDeadline),
      cohortType: c.type as CohortType,
      raw: c,
    }));

    return [...enrolledRows, ...availableRows];
  }, [myCohorts, availableCohorts]);

  const grouped = useMemo(() => {
    const active = allRows.filter((c) => c.status === 'Active');
    const upcoming = allRows.filter((c) => c.status === 'Upcoming');
    const completed = allRows.filter((c) => c.status === 'Completed');
    return { Active: active, Upcoming: upcoming, Completed: completed };
  }, [allRows]);

  const tabs = useMemo(
    () => [
      { label: 'Active', value: 'Active', count: grouped.Active.length },
      { label: 'Upcoming', value: 'Upcoming', count: grouped.Upcoming.length },
      { label: 'Completed', value: 'Completed', count: grouped.Completed.length },
    ],
    [grouped],
  );

  const filteredCohorts = grouped[activeTab as keyof typeof grouped] ?? [];

  const handleJoinCohort = (cohortId: string, cohortName: string) => {
    if (!isProfileComplete(userData)) {
      navigate('/me', { state: { showEmailPopup: true } });
      return;
    }
    setConfirmationModal({ show: true, cohortId, cohortName, isWaitlist: false });
  };

  const handleJoinWaitlist = (cohortId: string, cohortType: CohortType) => {
    if (!isProfileComplete(userData)) {
      navigate('/me', { state: { showEmailPopup: true } });
      return;
    }
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
        },
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
        },
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
    <div className="min-h-screen bg-zinc-900 text-zinc-100 px-4 md:px-10 lg:px-16 py-6" style={{ fontFamily: 'Sora, sans-serif' }}>
      {/* Student accent bar */}
      <div className="h-1 bg-gradient-to-r from-teal-500 via-cyan-400 to-blue-500 rounded-full mb-6" />

      {/* Header */}
      <div className="mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center justify-center w-12 h-12 rounded-xl bg-teal-500/15 border border-teal-500/25">
              <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className=''>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold">My Dashboard</h1>
                <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/15 text-teal-400 border border-teal-500/25">
                  Student
                </span>
              </div>
              <p className="text-zinc-400 text-sm mt-1">View and manage your cohorts.</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/me')}
            className="b-0 inline-flex items-center gap-2 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 text-sm font-medium px-5 py-2.5 rounded-lg border border-teal-500/25 transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Profile
          </button>
        </header>

        {/* Tabs + Table */}
        <div className="bg-zinc-800/50 rounded-xl border border-teal-500/20 overflow-hidden">
          <div className="px-4 pt-3">
            <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
          </div>

          <CohortTable
            cohorts={filteredCohorts}
            loading={isLoading}
            emptyMessage={`No ${activeTab.toLowerCase()} cohorts.`}
            onRowClick={(cohort) => {
              const row = cohort as DashboardCohortRow;
              if (row.enrolled && userData?.id) {
                const params = new URLSearchParams({
                  studentId: userData.id,
                  cohortType: row.type,
                  cohortId: row.id,
                  ...(userData.name && { studentName: userData.name }),
                  ...(userData.email && { studentEmail: userData.email }),
                });
                navigate(`/detailPage?${params.toString()}`);
              }
            }}
            actions={(cohort) => {
              const row = cohort as DashboardCohortRow;
              const isJoining = loadingCohortId === row.id;

              if (row.enrolled) {
                return (
                  <button
                    onClick={() => {
                      if (userData?.id) {
                        const params = new URLSearchParams({
                          studentId: userData.id,
                          cohortType: row.type,
                          cohortId: row.id,
                          ...(userData.name && { studentName: userData.name }),
                          ...(userData.email && { studentEmail: userData.email }),
                        });
                        navigate(`/detailPage?${params.toString()}`);
                      }
                    }}
                    className="b-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 rounded-md transition-colors duration-150"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View
                  </button>
                );
              }

              // Available cohort - show Join or Waitlist
              if (row.registrationOpen) {
                return (
                  <button
                    onClick={() => handleJoinCohort(row.id, formatCohortType(row.type))}
                    disabled={isJoining}
                    className="b-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-400 bg-green-500/10 hover:bg-green-500/20 rounded-md transition-colors duration-150 disabled:opacity-50"
                  >
                    {isJoining ? (
                      <div className="animate-spin rounded-full h-3 w-3 border border-green-400 border-t-transparent" />
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                    )}
                    Join
                  </button>
                );
              }

              return (
                <button
                  onClick={() => row.cohortType && handleJoinWaitlist(row.id, row.cohortType)}
                  disabled={isJoining}
                  className="b-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-md transition-colors duration-150 disabled:opacity-50"
                >
                  {isJoining ? (
                    <div className="animate-spin rounded-full h-3 w-3 border border-blue-400 border-t-transparent" />
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  Waitlist
                </button>
              );
            }}
          />
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmationModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-800 rounded-xl p-6 max-w-md w-full mx-4 border border-zinc-700">
            <h3 className="text-lg font-bold text-white mb-3">
              {confirmationModal.isWaitlist ? 'Join Waitlist' : 'Join Cohort'}
            </h3>
            <p className="text-zinc-300 text-sm mb-6">
              {confirmationModal.isWaitlist
                ? `Are you sure you want to join the waitlist for ${confirmationModal.cohortName}?`
                : `Are you sure you want to join the ${confirmationModal.cohortName} cohort?`}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelJoinCohort}
                className="b-0 px-4 py-2 bg-zinc-700 text-zinc-300 text-sm rounded-lg hover:bg-zinc-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmJoinCohort}
                className="b-0 px-4 py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 transition-colors"
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
