import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { useCohorts, useCreateCohort, useUpdateCohort } from '../hooks/cohortHooks';
import { useUser } from '../hooks/userHooks';
import { UserRole, CohortType } from '../types/enums';
import type { GetCohortResponseDto, LeaderboardEntryDto } from '../types/api';
import type { ApiCohort, CohortStatus } from '../types/cohort';
import apiService from '../services/apiService';
import Tabs from '../components/ui/Tabs';
import CohortTable from '../components/ui/CohortTable';
import type { CohortRow } from '../components/ui/CohortTable';
import { cohortTypeToName } from '../helpers/cohortHelpers';
import { computeStatus, COHORT_TYPES } from '../utils/cohortUtils';
import { getTodayDate, calculateEndDate, calculateStartDate, calculateRegistrationDeadline, formatDateForInput } from '../utils/dateUtils';
import { downloadCSV } from '../utils/csvUtils';

export const CohortSelection = () => {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useCohorts({ page: 0, pageSize: 100 });
  const { data: user } = useUser();
  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.TEACHING_ASSISTANT;

  const createCohortMutation = useCreateCohort();
  const updateCohortMutation = useUpdateCohort();

  const [activeTab, setActiveTab] = useState<string>('Active');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState<GetCohortResponseDto | null>(null);
  const [selectedCohortType, setSelectedCohortType] = useState<CohortType | null>(null);

  // Form state
  const [formSeason, setFormSeason] = useState<number>(1);
  const [formWeeks, setFormWeeks] = useState<number>(8);
  const [formStartDate, setFormStartDate] = useState<string>('');
  const [formEndDate, setFormEndDate] = useState<string>('');
  const [formRegDeadline, setFormRegDeadline] = useState<string>('');
  const [formHasExercises, setFormHasExercises] = useState<boolean>(true);
  const [lastChangedField, setLastChangedField] = useState<'startDate' | 'endDate' | null>(null);

  // Popup state
  const [popup, setPopup] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  // Auto-calculate end date in create mode
  useEffect(() => {
    if (formStartDate && formWeeks && !isEditMode) {
      setFormEndDate(calculateEndDate(formStartDate, formWeeks));
    }
  }, [formStartDate, formWeeks, isEditMode]);

  // Auto-calculate registration deadline in create mode
  useEffect(() => {
    if (formStartDate && !isEditMode) {
      setFormRegDeadline(calculateRegistrationDeadline(formStartDate));
    }
  }, [formStartDate, isEditMode]);

  // Handle bidirectional date changes in edit mode
  useEffect(() => {
    if (isEditMode && formWeeks) {
      if (lastChangedField === 'startDate' && formStartDate) {
        setFormEndDate(calculateEndDate(formStartDate, formWeeks));
        setLastChangedField(null);
      } else if (lastChangedField === 'endDate' && formEndDate) {
        setFormStartDate(calculateStartDate(formEndDate, formWeeks));
        setLastChangedField(null);
      }
    }
  }, [lastChangedField, formStartDate, formEndDate, formWeeks, isEditMode]);

  // ── Participant counts via leaderboard ──

  const cohortIds = useMemo(() => (data?.records ?? []).map((r) => r.id), [data]);

  const leaderboardQueries = useQueries({
    queries: cohortIds.map((cohortId) => ({
      queryKey: ['scores', 'cohort', cohortId, 'leaderboard'],
      queryFn: () => apiService.getCohortLeaderboard(cohortId),
      staleTime: 5 * 60 * 1000,
      enabled: cohortIds.length > 0,
    })),
  });

  const participantCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    cohortIds.forEach((id, i) => {
      const result = leaderboardQueries[i];
      if (result?.data) {
        const lb = result.data;
        const entries: LeaderboardEntryDto[] = Array.isArray(lb) ? lb : (lb as { leaderboard: LeaderboardEntryDto[] }).leaderboard ?? [];
        counts[id] = entries.length;
      }
    });
    return counts;
  }, [cohortIds, leaderboardQueries]);

  // ── Table data ──

  const cohorts = useMemo(() => {
    const records: ApiCohort[] = data?.records ?? [];
    return records.map((c) => ({
      id: c.id,
      name: cohortTypeToName(c.type as CohortType),
      type: c.type,
      season: c.season,
      status: computeStatus(c.startDate, c.endDate),
      startDate: c.startDate,
      endDate: c.endDate,
      weeks: c.weeks?.length ?? 0,
      participants: participantCounts[c.id],
      raw: c,
    }));
  }, [data, participantCounts]);

  const grouped = useMemo(() => {
    const active = cohorts.filter((c) => c.status === 'Active');
    const upcoming = cohorts.filter((c) => c.status === 'Upcoming');
    const completed = cohorts.filter((c) => c.status === 'Completed');
    return { Active: active, Upcoming: upcoming, Completed: completed };
  }, [cohorts]);

  const tabs = useMemo(
    () => [
      { label: 'Active', value: 'Active', count: grouped.Active.length },
      { label: 'Upcoming', value: 'Upcoming', count: grouped.Upcoming.length },
      { label: 'Completed', value: 'Completed', count: grouped.Completed.length },
    ],
    [grouped],
  );

  const filteredCohorts = grouped[activeTab as CohortStatus] ?? [];

  const handleRowClick = useCallback(
    (cohort: CohortRow) => {
      navigate(`/cohort/${cohort.id}`, { state: { cohort: cohort.raw } });
    },
    [navigate],
  );

  const handleDownloadCSV = useCallback(() => {
    const rows = grouped[activeTab as CohortStatus] ?? [];
    downloadCSV(
      ['Cohort', 'Season', 'Status', 'Weeks', 'Participants', 'Start Date', 'End Date'],
      rows.map((c) => [c.name, `S${c.season}`, c.status, c.weeks ?? '', c.participants ?? '', c.startDate, c.endDate]),
      `cohorts-${activeTab.toLowerCase()}.csv`,
    );
  }, [grouped, activeTab]);

  // ── Modal helpers ──

  const openCreateModal = () => {
    setIsEditMode(false);
    setSelectedCohort(null);
    setSelectedCohortType(null);
    setFormSeason(1);
    setFormWeeks(8);
    setFormStartDate(getTodayDate());
    setFormEndDate(calculateEndDate(getTodayDate(), 8));
    setFormRegDeadline('');
    setFormHasExercises(true);
    setLastChangedField(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cohort: CohortRow) => {
    const dto = data?.records?.find((r) => r.id === cohort.id);
    if (!dto) return;

    setIsEditMode(true);
    setSelectedCohort(dto);
    setSelectedCohortType(dto.type as CohortType);
    setFormSeason(dto.season);
    setFormWeeks(dto.weeks?.length || 8);
    setFormStartDate(formatDateForInput(dto.startDate));
    setFormEndDate(formatDateForInput(dto.endDate));
    setFormRegDeadline(formatDateForInput(dto.registrationDeadline));
    setFormHasExercises(true);
    setLastChangedField(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCohort(null);
    setSelectedCohortType(null);
    setFormSeason(1);
    setFormWeeks(8);
    setFormStartDate('');
    setFormEndDate('');
    setFormRegDeadline('');
    setFormHasExercises(true);
    setLastChangedField(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEditMode && !selectedCohortType) {
      setPopup({ show: true, message: 'Please select a cohort type.', type: 'error' });
      return;
    }

    if (!formStartDate || !formEndDate || !formRegDeadline) {
      setPopup({ show: true, message: 'Please fill in all required fields.', type: 'error' });
      return;
    }

    try {
      if (isEditMode && selectedCohort) {
        await updateCohortMutation.mutateAsync({
          cohortId: selectedCohort.id,
          body: { startDate: formStartDate, endDate: formEndDate, registrationDeadline: formRegDeadline },
        });
        await refetch();
        setPopup({ show: true, message: 'Cohort updated successfully!', type: 'success' });
      } else if (selectedCohortType) {
        await createCohortMutation.mutateAsync({
          type: selectedCohortType,
          season: formSeason,
          weeks: formWeeks,
          startDate: formStartDate,
          endDate: formEndDate,
          registrationDeadline: formRegDeadline,
          hasExercises: formHasExercises,
        });
        await refetch();
        setPopup({ show: true, message: 'Cohort created successfully!', type: 'success' });
      }
      closeModal();
    } catch (err) {
      let errorMessage = 'Failed to save cohort. Please try again.';
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const re = err as { response?: { data?: { message?: string } } };
        if (re.response?.data?.message) errorMessage = re.response.data.message;
      }
      setPopup({ show: true, message: errorMessage, type: 'error' });
    }
  };

  // ── Render ──

  return (
    <div className="min-h-screen bg-zinc-900 px-4 md:px-10 lg:px-16 py-6" style={{ fontFamily: 'Sora, sans-serif' }}>
      {/* Admin accent bar */}
      <div className="h-1 bg-gradient-to-r from-orange-500 via-orange-400 to-amber-500 rounded-full mb-6" />

      <div className="mx-auto">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center justify-center w-12 h-12 rounded-xl bg-orange-500/15 border border-orange-500/25">
              <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold text-zinc-100">Cohort Selection</h1>
                <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/15 text-orange-400 border border-orange-500/25">
                  Admin
                </span>
              </div>
              <p className="text-zinc-400 text-sm mt-1">Select a cohort to manage students.</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-900/30 border border-red-700/50 px-4 py-3 text-red-300 text-sm">
            {(error as Error)?.message ?? 'Failed to load cohorts.'}
          </div>
        )}

        {/* Tabs + Table card */}
        <div className="bg-zinc-800/50 rounded-xl border border-orange-500/20 overflow-hidden">
          {/* Tab bar + Create button */}
          <div className="flex items-end justify-between px-4 pt-3">
            <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={handleDownloadCSV}
                className="b-0 flex items-center gap-2 bg-zinc-700/50 hover:bg-zinc-600/50 text-zinc-300 text-sm font-medium px-4 py-2.5 rounded-lg border border-zinc-600 transition-colors duration-200"
                title="Download CSV"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                CSV
              </button>
              {isAdmin && (
                <button
                  onClick={openCreateModal}
                  className="b-0 flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Cohort
                </button>
              )}
            </div>
          </div>

          <CohortTable
            cohorts={filteredCohorts}
            onRowClick={handleRowClick}
            loading={isLoading}
            emptyMessage={`No ${activeTab.toLowerCase()} cohorts found.`}
            actions={isAdmin ? (cohort) => (
              <button
                onClick={() => openEditModal(cohort)}
                className="b-0 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-700/50 hover:bg-zinc-600/50 rounded-lg transition-colors duration-150"
                title="Edit Cohort"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit
              </button>
            ) : undefined}
          />
        </div>
      </div>

      {/* ── Create / Edit Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-6">
          <div className="bg-zinc-800 rounded-2xl shadow-2xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-100">
                {isEditMode ? 'Edit Cohort' : 'Create Cohort'}
              </h2>
              <button onClick={closeModal} className="b-0 bg-transparent text-zinc-400 hover:text-zinc-100 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-zinc-400 text-sm mb-8">
              {isEditMode
                ? `Update the details for ${selectedCohortType ? cohortTypeToName(selectedCohortType) : ''} cohort.`
                : 'Fill out the information below to create a new cohort.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Cohort type selector - create mode only */}
              {!isEditMode && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-zinc-300">Cohort Type</label>
                  <select
                    value={selectedCohortType ?? ''}
                    onChange={(e) => {
                      const val = e.target.value as CohortType;
                      setSelectedCohortType(val);
                      // Auto-set next season
                      const existing = data?.records?.filter((r) => r.type === val) ?? [];
                      const maxSeason = existing.length > 0 ? Math.max(...existing.map((c) => c.season)) : 0;
                      setFormSeason(maxSeason + 1);
                    }}
                    required
                    className="w-64 b-0 bg-zinc-700 border border-zinc-600 rounded-lg pl-2 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  >
                    <option value="" disabled>
                      Select a cohort type
                    </option>
                    {COHORT_TYPES.map((ct) => (
                      <option key={ct} value={ct} className="bg-zinc-800">
                        {cohortTypeToName(ct)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Season + Weeks - create mode */}
              {!isEditMode && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-zinc-300">Season</label>
                    <input
                      type="number"
                      value={formSeason}
                      onChange={(e) => setFormSeason(parseInt(e.target.value))}
                      min="1"
                      className="w-32 b-0 bg-zinc-700 border border-zinc-600 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-zinc-300">Number of Weeks</label>
                    <input
                      type="number"
                      value={formWeeks}
                      onChange={(e) => setFormWeeks(parseInt(e.target.value))}
                      min="1"
                      max="52"
                      className="w-32 b-0 bg-zinc-700 border border-zinc-600 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Weeks - edit mode (readonly) */}
              {isEditMode && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-zinc-300">
                    Number of Weeks <span className="text-zinc-500 text-xs">(Fixed)</span>
                  </label>
                  <input
                    type="number"
                    value={formWeeks}
                    disabled
                    className="w-64 b-0 bg-zinc-700 border border-zinc-600 rounded-lg px-4 py-3 text-zinc-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              )}

              {/* Start / End dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <label className="block text-sm font-medium mb-2 text-zinc-300">Start Date</label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => {
                      setFormStartDate(e.target.value);
                      if (isEditMode) setLastChangedField('startDate');
                    }}
                    min={getTodayDate()}
                    required
                    className="w-64 b-0 bg-zinc-700 border border-zinc-600 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-sm font-medium mb-2 text-zinc-300">
                    End Date {!isEditMode && <span className="text-zinc-500 text-xs">(Auto-calculated)</span>}
                  </label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => {
                      setFormEndDate(e.target.value);
                      if (isEditMode) setLastChangedField('endDate');
                    }}
                    min={formStartDate ? calculateEndDate(formStartDate, 1) : getTodayDate()}
                    disabled={!isEditMode}
                    required
                    className="w-64 b-0 bg-zinc-700 border border-zinc-600 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>

              {/* Registration deadline */}
              <div>
                <label className="block text-sm font-medium mb-2 text-zinc-300">Registration Deadline</label>
                <input
                  type="date"
                  value={formRegDeadline}
                  onChange={(e) => setFormRegDeadline(e.target.value)}
                  required
                  className="w-64 b-0 bg-zinc-700 border border-zinc-600 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              {/* Has exercises - create mode only */}
              {!isEditMode && (
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="hasExercises"
                    checked={formHasExercises}
                    onChange={(e) => setFormHasExercises(e.target.checked)}
                    className="w-5 h-5 bg-zinc-700 border border-zinc-600 rounded text-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-0"
                  />
                  <label htmlFor="hasExercises" className="text-sm font-medium text-zinc-300">
                    Has Exercises
                  </label>
                </div>
              )}

              {/* Buttons */}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="b-0 bg-transparent hover:bg-zinc-700 text-zinc-300 font-medium px-6 py-3 rounded-lg border border-zinc-600 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCohortMutation.isPending || updateCohortMutation.isPending}
                  className="b-0 bg-orange-500 hover:bg-orange-600 text-white font-medium px-8 py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createCohortMutation.isPending || updateCohortMutation.isPending
                    ? 'Saving...'
                    : isEditMode
                      ? 'Update'
                      : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Success / Error popup ── */}
      {popup.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="flex flex-col items-center text-center">
              {popup.type === 'success' ? (
                <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
              <h3 className="text-xl font-bold text-zinc-100 mb-2">
                {popup.type === 'success' ? 'Success!' : 'Error'}
              </h3>
              <p className="text-zinc-300 text-sm mb-6">{popup.message}</p>
              <button
                onClick={() => setPopup({ show: false, message: '', type: 'success' })}
                className="b-0 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 font-medium px-6 py-2.5 rounded-lg transition-colors duration-200"
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
