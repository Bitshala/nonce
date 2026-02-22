import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Button,
  Paper,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormControlLabel,
  Checkbox,
  IconButton,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import {
  Settings,
  Download,
  Plus,
  X,
  Pencil,
  Award,
} from 'lucide-react';
import { useCohorts, useCreateCohort, useUpdateCohort } from '../hooks/cohortHooks';
import { useUser } from '../hooks/userHooks';
import { useGenerateCohortCertificates } from '../hooks/certificateHooks';
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

const inputSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#18181b',
    color: '#fafafa',
    '& fieldset': { borderColor: '#52525b' },
    '&:hover fieldset': { borderColor: '#f97316' },
    '&.Mui-focused fieldset': { borderColor: '#f97316' },
    '&.Mui-disabled': { bgcolor: '#18181b' },
    '&.Mui-disabled fieldset': { borderColor: '#3f3f46' },
  },
  '& .MuiInputLabel-root': { color: '#d4d4d8' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#f97316' },
  '& .MuiInputLabel-root.Mui-disabled': { color: '#a1a1aa' },
  '& .MuiInputBase-input': { color: '#fafafa' },
  '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: '#a1a1aa' },
  '& .MuiSelect-icon': { color: '#d4d4d8' },
};

export const CohortSelection = () => {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useCohorts({ page: 0, pageSize: 100 });
  const { data: user } = useUser();
  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.TEACHING_ASSISTANT;

  const createCohortMutation = useCreateCohort();
  const updateCohortMutation = useUpdateCohort();
  const { mutate: generateCertificates, isPending: isGeneratingCerts } = useGenerateCohortCertificates();

  const [activeTab, setActiveTab] = useState<string>('Active');
  const [generatingCohortId, setGeneratingCohortId] = useState<string | null>(null);

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

  // Snackbar state
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
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

  // Participant counts via leaderboard
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

  // Table data
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

  // Modal helpers
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

  const handleGenerateCertificates = (cohortId: string, cohortName: string) => {
    setGeneratingCohortId(cohortId);
    generateCertificates(
      { cohortId },
      {
        onSuccess: () => {
          setGeneratingCohortId(null);
          setSnackbar({ open: true, message: `Certificates generated for ${cohortName}!`, severity: 'success' });
        },
        onError: (error) => {
          setGeneratingCohortId(null);
          let errorMessage = 'Failed to generate certificates.';
          if (typeof error === 'object' && error !== null && 'response' in error) {
            const re = error as { response?: { data?: { message?: string } } };
            if (re.response?.data?.message) errorMessage = re.response.data.message;
          }
          setSnackbar({ open: true, message: errorMessage, severity: 'error' });
        },
      },
    );
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
      setSnackbar({ open: true, message: 'Please select a cohort type.', severity: 'error' });
      return;
    }

    if (!formStartDate || !formEndDate || !formRegDeadline) {
      setSnackbar({ open: true, message: 'Please fill in all required fields.', severity: 'error' });
      return;
    }

    try {
      if (isEditMode && selectedCohort) {
        await updateCohortMutation.mutateAsync({
          cohortId: selectedCohort.id,
          body: { startDate: formStartDate, endDate: formEndDate, registrationDeadline: formRegDeadline },
        });
        await refetch();
        setSnackbar({ open: true, message: 'Cohort updated successfully!', severity: 'success' });
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
        setSnackbar({ open: true, message: 'Cohort created successfully!', severity: 'success' });
      }
      closeModal();
    } catch (err) {
      let errorMessage = 'Failed to save cohort. Please try again.';
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const re = err as { response?: { data?: { message?: string } } };
        if (re.response?.data?.message) errorMessage = re.response.data.message;
      }
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    }
  };

  // Render
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#000', px: { xs: 2, md: 5, lg: 8 }, py: 3, fontFamily: 'Sora, sans-serif' }}>
      {/* Accent bar */}
      <Box sx={{ height: 4, background: 'linear-gradient(to right, #f97316, #fb923c, #f59e0b)', borderRadius: 2, mb: 4 }} />

      <Box sx={{ mx: 'auto' }}>
        {/* Page Header */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, mb: 4 }}>
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 48,
              borderRadius: 2.5,
              bgcolor: 'rgba(249,115,22,0.15)',
              border: '1px solid rgba(249,115,22,0.25)',
              flexShrink: 0,
            }}
          >
            <Settings size={24} color="#fb923c" />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#fafafa', fontSize: { xs: '1.5rem', md: '1.75rem' } }}>
                Cohort Selection
              </Typography>
              <Chip
                label="Admin"
                size="small"
                sx={{
                  display: { xs: 'none', sm: 'inline-flex' },
                  bgcolor: 'rgba(249,115,22,0.15)',
                  color: '#fb923c',
                  border: '1px solid rgba(249,115,22,0.25)',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  height: 24,
                }}
              />
            </Box>
            <Typography variant="body2" sx={{ color: '#71717a', mt: 0.5 }}>
              Select a cohort to manage students.
            </Typography>
          </Box>
        </Box>

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mb: 3, bgcolor: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', '& .MuiAlert-icon': { color: '#ef4444' } }}>
            {(error as Error)?.message ?? 'Failed to load cohorts.'}
          </Alert>
        )}

        {/* Main Card */}
        <Paper
          elevation={0}
          sx={{
            bgcolor: 'rgba(39,39,42,0.5)',
            borderRadius: 3,
            border: '1px solid rgba(249,115,22,0.2)',
            overflow: 'hidden',
          }}
        >
          {/* Tab bar + Action buttons */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'stretch', sm: 'flex-end' },
              justifyContent: 'space-between',
              px: { xs: 2, sm: 3 },
              pt: 1.5,
              gap: 1.5,
            }}
          >
            <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

            <Box sx={{ display: 'flex', gap: 1, mb: { xs: 0, sm: 0.5 }, flexShrink: 0 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Download size={15} />}
                onClick={handleDownloadCSV}
                sx={{
                  color: '#d4d4d8',
                  borderColor: '#52525b',
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '0.8rem',
                  '&:hover': { borderColor: '#71717a', bgcolor: 'rgba(255,255,255,0.04)' },
                }}
              >
                CSV
              </Button>
              {isAdmin && (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<Plus size={15} />}
                  onClick={openCreateModal}
                  sx={{
                    bgcolor: '#f97316',
                    '&:hover': { bgcolor: '#ea580c' },
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: '0.8rem',
                    boxShadow: 'none',
                  }}
                >
                  Create Cohort
                </Button>
              )}
            </Box>
          </Box>

          {/* Table */}
          <CohortTable
            cohorts={filteredCohorts}
            onRowClick={handleRowClick}
            loading={isLoading}
            emptyMessage={`No ${activeTab.toLowerCase()} cohorts found.`}
            actions={isAdmin ? (cohort) => (
              <>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Pencil size={13} />}
                  onClick={() => openEditModal(cohort)}
                  sx={{
                    color: '#d4d4d8',
                    borderColor: '#52525b',
                    textTransform: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    py: 0.5,
                    '&:hover': { borderColor: '#71717a', bgcolor: 'rgba(255,255,255,0.04)' },
                  }}
                >
                  Edit
                </Button>
                {cohort.status === 'Completed' && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={
                      isGeneratingCerts && generatingCohortId === cohort.id
                        ? <CircularProgress size={13} sx={{ color: '#f59e0b' }} />
                        : <Award size={13} />
                    }
                    disabled={isGeneratingCerts && generatingCohortId === cohort.id}
                    onClick={() => handleGenerateCertificates(cohort.id, cohort.name)}
                    sx={{
                      color: '#fbbf24',
                      borderColor: 'rgba(245,158,11,0.3)',
                      textTransform: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      py: 0.5,
                      '&:hover': { borderColor: 'rgba(245,158,11,0.5)', bgcolor: 'rgba(245,158,11,0.08)' },
                      '&.Mui-disabled': { color: '#92400e', borderColor: 'rgba(245,158,11,0.15)' },
                    }}
                  >
                    Generate Certs
                  </Button>
                )}
              </>
            ) : undefined}
          />
        </Paper>
      </Box>

      {/* Create / Edit Modal */}
      <Dialog
        open={isModalOpen}
        onClose={closeModal}
        maxWidth="sm"
        fullWidth
        slotProps={{
          backdrop: { sx: { backdropFilter: 'blur(6px)', bgcolor: 'rgba(0,0,0,0.7)' } },
        }}
        PaperProps={{
          sx: {
            bgcolor: '#1c1c1e',
            backgroundImage: 'none',
            borderRadius: 3,
            border: '1px solid #3f3f46',
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 0 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#fafafa' }}>
              {isEditMode ? 'Edit Cohort' : 'Create Cohort'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#a1a1aa' }}>
              {isEditMode
                ? `Update details for ${selectedCohortType ? cohortTypeToName(selectedCohortType) : ''} cohort.`
                : 'Fill out the information to create a new cohort.'}
            </Typography>
          </Box>
          <IconButton onClick={closeModal} size="small" sx={{ color: '#a1a1aa', '&:hover': { color: '#fafafa' } }}>
            <X size={20} />
          </IconButton>
        </DialogTitle>

        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 3 }}>
            {/* Cohort Type */}
            {!isEditMode && (
              <FormControl fullWidth sx={inputSx}>
                <InputLabel>Cohort Type</InputLabel>
                <Select
                  value={selectedCohortType ?? ''}
                  label="Cohort Type"
                  onChange={(e) => {
                    const val = e.target.value as CohortType;
                    setSelectedCohortType(val);
                    const existing = data?.records?.filter((r) => r.type === val) ?? [];
                    const maxSeason = existing.length > 0 ? Math.max(...existing.map((c) => c.season)) : 0;
                    setFormSeason(maxSeason + 1);
                  }}
                  required
                  MenuProps={{ PaperProps: { sx: { bgcolor: '#18181b', border: '1px solid #27272a', color: '#fafafa' } } }}
                >
                  {COHORT_TYPES.map((ct) => (
                    <MenuItem key={ct} value={ct} sx={{ '&:hover': { bgcolor: '#52525b' } }}>
                      {cohortTypeToName(ct)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Season + Weeks */}
            {!isEditMode && (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField label="Season" type="number" value={formSeason} onChange={(e) => setFormSeason(parseInt(e.target.value))} slotProps={{ htmlInput: { min: 1 } }} sx={{ ...inputSx, flex: 1 }} />
                <TextField label="Weeks" type="number" value={formWeeks} onChange={(e) => setFormWeeks(parseInt(e.target.value))} slotProps={{ htmlInput: { min: 1, max: 52 } }} sx={{ ...inputSx, flex: 1 }} />
              </Box>
            )}

            {/* Weeks readonly in edit mode */}
            {isEditMode && (
              <TextField label="Number of Weeks (Fixed)" type="number" value={formWeeks} disabled sx={inputSx} />
            )}

            {/* Dates */}
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField
                label="Start Date"
                type="date"
                value={formStartDate}
                onChange={(e) => { setFormStartDate(e.target.value); if (isEditMode) setLastChangedField('startDate'); }}
                slotProps={{ htmlInput: { min: getTodayDate() }, inputLabel: { shrink: true } }}
                required
                sx={{ ...inputSx, flex: 1, '& input': { colorScheme: 'dark' } }}
              />
              <TextField
                label={isEditMode ? 'End Date' : 'End Date (Auto)'}
                type="date"
                value={formEndDate}
                onChange={(e) => { setFormEndDate(e.target.value); if (isEditMode) setLastChangedField('endDate'); }}
                slotProps={{ htmlInput: { min: formStartDate ? calculateEndDate(formStartDate, 1) : getTodayDate() }, inputLabel: { shrink: true } }}
                disabled={!isEditMode}
                required
                sx={{ ...inputSx, flex: 1, '& input': { colorScheme: 'dark' } }}
              />
            </Box>

            {/* Registration Deadline */}
            <TextField
              label="Registration Deadline"
              type="date"
              value={formRegDeadline}
              onChange={(e) => setFormRegDeadline(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              required
              sx={{ ...inputSx, '& input': { colorScheme: 'dark' } }}
            />

            {/* Has exercises */}
            {!isEditMode && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formHasExercises}
                    onChange={(e) => setFormHasExercises(e.target.checked)}
                    sx={{ color: '#71717a', '&.Mui-checked': { color: '#f97316' } }}
                  />
                }
                label={<Typography variant="body2" sx={{ color: '#fafafa' }}>Has Exercises</Typography>}
              />
            )}
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
            <Button
              onClick={closeModal}
              variant="outlined"
              sx={{
                color: '#d4d4d8',
                borderColor: '#52525b',
                textTransform: 'none',
                '&:hover': { borderColor: '#71717a', bgcolor: 'rgba(255,255,255,0.04)' },
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createCohortMutation.isPending || updateCohortMutation.isPending}
              sx={{
                bgcolor: '#f97316',
                '&:hover': { bgcolor: '#ea580c' },
                textTransform: 'none',
                fontWeight: 600,
                boxShadow: 'none',
                '&.Mui-disabled': { bgcolor: '#78350f', color: '#92400e' },
              }}
            >
              {createCohortMutation.isPending || updateCohortMutation.isPending
                ? <CircularProgress size={20} sx={{ color: '#fff' }} />
                : isEditMode ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
