/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button as MuiButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
} from '@mui/material';
import { Eye, X } from 'lucide-react';

import { TableHeader } from '../components/table/TableHeader';
import { StudentTableGrid } from '../components/table/StudentTableGrid';
import { ScoreEditModal } from '../components/table/ScoreEditModal';
import { TableContextMenu } from '../components/table/TableContextMenu';

import { computeTotal, cohortHasExercises } from '../utils/calculations';
import { downloadCSV } from '../utils/csvUtils';
import type { TableRowData } from '../types/student';

import {
  useScoresForCohortAndWeek,
  useUpdateScoresForUserCohortAndWeek,
  useAssignGroupsForCohortWeek,
  useAssignSelfToGroup,
} from '../hooks/scoreHooks';
import { useCohort, useRemoveUserFromCohort } from '../hooks/cohortHooks';
import { useUser } from '../hooks/userHooks';
import { UserRole } from '../types/enums';
import { cohortTypeToName, formatCohortDate } from '../helpers/cohortHelpers.ts';

const DEFAULT_GROUPS = ['Group 0', 'Group 1', 'Group 2', 'Group 3', 'Group 4', 'Group 5'];

const TableView: React.FC = () => {
  const navigate = useNavigate();
  const { id: cohortIdParam } = useParams<{ id: string }>();

  // === User data ===
  const { data: userData } = useUser();
  const isTA = userData?.role === UserRole.TEACHING_ASSISTANT;

  // === Cohort & Weeks (dynamic from hook) ===
  const {
    data: cohortData,
    isLoading: isCohortLoading,
    error: cohortError,
  } = useCohort(cohortIdParam);

  const weeks = useMemo(() => cohortData?.weeks ?? [], [cohortData]);
  const baseGroups = useMemo(
    () => DEFAULT_GROUPS,
    []
  );

  // We keep both the selectedWeekId (source of truth for API) and a display-friendly numeric "weekIndex"
  const [selectedWeekId, setSelectedWeekId] = useState<string>(null);
  const [weekIndex, setWeekIndex] = useState<number>(0);

  // Derived week metadata
  const selectedWeekData = useMemo(
    () => weeks.find(w => w.id === selectedWeekId),
    [weeks, selectedWeekId]
  );
  const selectedWeekType = selectedWeekData?.type;
  const selectedWeekHasExercise = selectedWeekData?.hasExercise ?? false;

  // Initialize selected week from cohort once it arrives
  useEffect(() => {
    if (!selectedWeekId && weeks.length > 0) {
      setSelectedWeekId(weeks[0].id);
      setWeekIndex(0);
    }
  }, [selectedWeekId, weeks]);

  // === Scores for selected week ===
  const {
    data: scoresData,
    error: scoresError,
    isLoading: isScoresLoading,
    isPending: isScoresPending,
  } = useScoresForCohortAndWeek({
    cohortId: cohortIdParam,
    weekId: selectedWeekId,
  }, {enabled: !!selectedWeekId});

  // === Local table state ===
  const [data, setData] = useState<TableRowData[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('All Groups');
  const [selectedTA, setSelectedTA] = useState<string>('All TAs');
  const [attendanceFilter, setAttendanceFilter] = useState<'All' | 'Present' | 'Absent'>('All');

  const [showScoreEditModal, setShowScoreEditModal] = useState(false);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<TableRowData | null>(null);

  const [showAssignGroupsModal, setShowAssignGroupsModal] = useState(false);
  const [participantsPerGroup, setParticipantsPerGroup] = useState<number>(8);
  const [groupsAvailable, setGroupsAvailable] = useState<number>(3);

  const [showTASelfAssignModal, setShowTASelfAssignModal] = useState(false);
  const [selectedGroupNumber, setSelectedGroupNumber] = useState<number>(0);

  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    targetId: number | null;
  }>({ visible: false, x: 0, y: 0, targetId: null });

  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [weeklyData, setWeeklyData] = useState<{ week: number; attended: number }>({
    week: 0,
    attended: 0,
  });

  // === Mutation ===
  const updateScoresMutation = useUpdateScoresForUserCohortAndWeek();
  const assignGroupsMutation = useAssignGroupsForCohortWeek();
  const assignSelfToGroupMutation = useAssignSelfToGroup();
  const removeUserMutation = useRemoveUserFromCohort();

  // === Transform API scores to table rows ===
  useEffect(() => {
    if (!scoresData?.scores || !Array.isArray(scoresData.scores)) {
      if (scoresError) {
        console.error('Error fetching weekly data:', scoresError);
      }
      setData([]);
      return;
    }

    const transformed: TableRowData[] = scoresData.scores.map((score: any, idx: number) => {
      const groupNumber = score.groupDiscussionScores?.groupNumber ?? 0;
      const teachingAssistant = score.teachingAssistant;
      console.log('Teaching Assistant data:', teachingAssistant);
      const taName = teachingAssistant
        ? (teachingAssistant.discordGlobalName || teachingAssistant.discordUsername || teachingAssistant.name || 'N/A')
        : 'N/A';

      const gd = score.groupDiscussionScores;
      const ex = score.exerciseScores;

      return {
        id: typeof score.userId === 'number' ? score.userId : idx,
        userId: score.userId, // maintain for API calls
        name: score.name ?? score.discordGlobalName ?? score.discordUsername ?? 'Unknown',
        discordGlobalName: score.discordGlobalName ?? score.discordUsername ?? score.name ?? 'Unknown',
        email: score.discordUsername ?? '', // discord username
        group: `Group ${groupNumber}`,
        ta: taName,
        attendance: Boolean(gd?.attendance),
        gdScore: gd ? {
          fa: gd.communicationScore ?? 0,
          fb: gd.depthOfAnswerScore ?? 0,
          fc: gd.technicalBitcoinFluencyScore ?? 0,
          fd: gd.engagementScore ?? 0,
        } : null,
        bonusScore: gd ? {
          attempt: gd.isBonusAttempted ? 1 : 0,
          good: gd.bonusAnswerScore ?? 0,
          followUp: gd.bonusFollowupScore ?? 0,
        } : null,
        exerciseScore: ex ? {
          Submitted: Boolean(ex.isSubmitted),
          privateTest: Boolean(ex.isPassing),
        } : null,
        week: weekIndex,
        total: score.totalScore ?? 0,
      };
    });

    setData(transformed);
    setTotalCount(scoresData.scores.length);
    setWeeklyData({week: weekIndex, attended: transformed.filter(s => s.attendance).length});
  }, [scoresData, scoresError, weekIndex]);

  // === Derived options ===
  const taOptions = useMemo(() => {
    if (!data || data.length === 0) return ['All TAs'];
    const unique = new Set(data.map((p) => p.ta).filter((ta) => ta && ta !== 'N/A'));
    return ['All TAs', ...Array.from(unique).sort()];
  }, [data]);

  // === Sorting ===
  const [sortConfig, setSortConfig] = useState<{
    key: keyof TableRowData | null;
    direction: 'ascending' | 'descending';
  }>({ key: null, direction: 'ascending' });

  const sortedFilteredData = useMemo(() => {
    let rows = [...data];

    if (selectedGroup !== 'All Groups') rows = rows.filter((p) => p.group === selectedGroup);
    if (selectedTA !== 'All TAs') rows = rows.filter((p) => p.ta === selectedTA);
    if (attendanceFilter === 'Present') rows = rows.filter((p) => p.attendance);
    if (attendanceFilter === 'Absent') rows = rows.filter((p) => !p.attendance);
    if (searchTerm) rows = rows.filter((p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortConfig.key) {
      const { key, direction } = sortConfig;
      const dir = direction === 'ascending' ? 1 : -1;

      rows.sort((a, b) => {
        const av = a[key!];
        const bv = b[key!];

        // string
        if (typeof av === 'string' && typeof bv === 'string') {
          return av.localeCompare(bv) * dir;
        }
        // number
        if (typeof av === 'number' && typeof bv === 'number') {
          return (av - bv) * dir;
        }
        // boolean
        if (typeof av === 'boolean' && typeof bv === 'boolean') {
          // true before false when ascending
          if (av === bv) return 0;
          return (av ? -1 : 1) * dir;
        }
        // fallback: keep stable
        return 0;
      });
    }

    return rows;
  }, [data, selectedGroup, selectedTA, attendanceFilter, searchTerm, sortConfig]);

  // === Handlers ===
  const handleWeekChange = useCallback(
    (newIndex: number, weekId: string) => {
      setWeekIndex(newIndex);
      setSelectedWeekId(weekId);
      setContextMenu({ visible: false, x: 0, y: 0, targetId: null });
    },
    []
  );

  const handleStudentClick = useCallback((student: TableRowData) => {
    const studentId = student.userId ?? student.id;
    const cohortType = cohortData?.type;
    const cohortId = cohortData?.id;
    const studentName = encodeURIComponent(student.name);
    navigate(`/detailPage?studentId=${studentId}&cohortType=${cohortType}&cohortId=${cohortId}&studentName=${studentName}&from=table`);
  }, [navigate, cohortData?.type, cohortData?.id]);

  const handleEditStudent = useCallback((student: TableRowData) => {
    setSelectedStudentForEdit(student);
    setShowScoreEditModal(true);
  }, []);

  const handleScoreUpdate = useCallback(
    (updated: TableRowData) => {
      if (!selectedStudentForEdit || !cohortData?.id || !selectedWeekId) return;

      const body = {
        attendance: updated.attendance,
        communicationScore: updated.gdScore?.fa ?? 0,
        depthOfAnswerScore: updated.gdScore?.fb ?? 0,
        technicalBitcoinFluencyScore: updated.gdScore?.fc ?? 0,
        engagementScore: updated.gdScore?.fd ?? 0,
        isBonusAttempted: (updated.bonusScore?.attempt ?? 0) > 0,
        bonusAnswerScore: updated.bonusScore?.good ?? 0,
        bonusFollowupScore: updated.bonusScore?.followUp ?? 0,
        isSubmitted: updated.exerciseScore?.Submitted ?? false,
        isPassing: updated.exerciseScore?.privateTest ?? false,
      };

      const userId = (selectedStudentForEdit as any).userId ?? String(selectedStudentForEdit.id);

      updateScoresMutation.mutate(
        {
          userId,
          cohortId: cohortData.id,
          weekId: selectedWeekId,
          body,
        },
        {
          onSuccess: () => {
            setData((prev) =>
              prev.map((p) =>
                p.id === updated.id ? { ...updated, total: computeTotal({
                  attendance: updated.attendance,
                  gdScore: updated.gdScore ?? { fa: 0, fb: 0, fc: 0, fd: 0 },
                  bonusScore: updated.bonusScore ?? { attempt: 0, good: 0, followUp: 0 },
                  exerciseScore: updated.exerciseScore ?? { Submitted: false, privateTest: false },
                }, cohortHasExercises(cohortData?.type || '')) } : p
              )
            );
            setShowScoreEditModal(false);
            setSelectedStudentForEdit(null);
          },
          onError: (error: unknown) => {
            console.error('Score update failed', error);
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            alert(`Failed to update scores: ${message}`);
          },
        }
      );
    },
    [selectedStudentForEdit, cohortData?.id, selectedWeekId, updateScoresMutation]
  );

  const handleDeleteStudent = useCallback((studentId: string) => {
    if (!cohortData?.id) {
      console.error('No cohort ID available');
      return;
    }

    removeUserMutation.mutate(
      {
        cohortId: cohortData.id,
        userId: studentId,
      },
      {
        onSuccess: () => {
          console.log('Successfully deleted student');
          // Remove student from local state
          setData((prev) => prev.filter((s) => {
            const id = s.userId ?? s.id;
            return String(id) !== String(studentId);
          }));
          alert('Student removed successfully!');
        },
        onError: (error: any) => {
          console.error('Failed to remove student - Full error:', error);
          console.error('Error response:', error?.response?.data);
          console.error('Error status:', error?.response?.status);
          const message = error?.response?.data?.message || error?.message || 'Unknown error occurred';
          alert(`Failed to remove student: ${message}`);
        },
      }
    );
  }, [cohortData?.id, removeUserMutation]);

  const handleDownloadCSV = useCallback(() => {
    const rows = sortedFilteredData;
    if (rows.length === 0) return;

    const hasExercises = cohortHasExercises(cohortData?.type || '');

    const headers = [
      'Name', 'Discord Name', 'Group', 'TA', 'Attendance',
      'Communication', 'Depth of Answer', 'Technical Bitcoin Fluency', 'Engagement',
      'Bonus Attempt', 'Bonus Good', 'Bonus Follow Up',
      ...(hasExercises ? ['Exercise Submitted', 'Exercise Passing'] : []),
      'Total',
    ];

    const csvRows = rows.map((r) => [
      r.name, r.email, r.group, r.ta, r.attendance ? 'Present' : 'Absent',
      r.gdScore?.fa ?? '-', r.gdScore?.fb ?? '-', r.gdScore?.fc ?? '-', r.gdScore?.fd ?? '-',
      r.bonusScore?.attempt ?? '-', r.bonusScore?.good ?? '-', r.bonusScore?.followUp ?? '-',
      ...(hasExercises ? [r.exerciseScore?.Submitted ? 'Yes' : 'No', r.exerciseScore?.privateTest ? 'Yes' : 'No'] : []),
      r.total,
    ]);

    const weekLabel = weekIndex !== undefined ? `week${weekIndex}` : 'all';
    downloadCSV(headers, csvRows, `students-${weekLabel}.csv`);
  }, [sortedFilteredData, cohortData?.type, weekIndex]);

  const handleAssignGroups = useCallback(() => {
    setShowAssignGroupsModal(true);
  }, []);

  const handleAssignGroupsSubmit = useCallback(() => {
    if (isNaN(participantsPerGroup) || isNaN(groupsAvailable) || participantsPerGroup <= 0 || groupsAvailable <= 0) {
      alert('Please enter valid positive numbers');
      return;
    }

    assignGroupsMutation.mutate(
      { weekId: selectedWeekId, cohortId: cohortIdParam, participantsPerWeek: participantsPerGroup, groupsAvailable },
      {
        onSuccess: () => {
          alert('Groups assigned successfully!');
          setShowAssignGroupsModal(false);
        },
        onError: (error: unknown) => {
          console.error('Group assignment failed', error);
          const message = error instanceof Error ? error.message : 'Unknown error occurred';
          alert(`Failed to assign groups: ${message}`);
        },
      }
    );
  }, [selectedWeekId, cohortIdParam, participantsPerGroup, groupsAvailable, assignGroupsMutation]);

  const handleTASelfAssign = useCallback(() => {
    setShowTASelfAssignModal(true);
  }, []);

  const handleTASelfAssignSubmit = useCallback(() => {
    if (!selectedWeekId || !cohortIdParam) {
      alert('Please select a week first');
      return;
    }

    assignSelfToGroupMutation.mutate(
      { weekId: selectedWeekId, cohortId: cohortIdParam, groupNumber: selectedGroupNumber },
      {
        onSuccess: () => {
          alert('Successfully assigned yourself to the group!');
          setShowTASelfAssignModal(false);
        },
        onError: (error: any) => {
          console.error('Self assignment failed', error);
          const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error occurred';

          // Check if it's a "no group found" error
          if (errorMessage.includes('No group found')) {
            alert(`Failed to assign to group: The group doesn't exist yet. Please ask an admin to assign groups for this week first using the "Assign Groups" button.`);
          } else {
            alert(`Failed to assign to group: ${errorMessage}`);
          }
        },
      }
    );
  }, [selectedWeekId, cohortIdParam, selectedGroupNumber, assignSelfToGroupMutation]);

  // === Loading & error states ===
  if (isCohortLoading || isScoresLoading || isScoresPending) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: '#000' }}>
        <CircularProgress sx={{ color: '#f97316' }} />
      </Box>
    );
  }

  if (cohortError) {
    return (
      <Box sx={{ p: 3, bgcolor: '#000', color: '#ef4444', minHeight: '100vh' }}>
        <Typography>Failed to load cohort.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3, lg: 4 }, bgcolor: '#000', color: '#d4d4d8', minHeight: '100vh' }}>
      <Box sx={{ maxWidth: '100%', mx: 'auto' }}>
        {/* Page Title */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
            mb: 3,
          }}
        >
          <Box>
            {cohortData && (
              <>
                <Typography
                  variant="h5"
                  sx={{ color: '#fafafa', fontWeight: 700, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
                >
                  {cohortTypeToName(cohortData.type)} &ndash; Season {cohortData.season}
                </Typography>
                <Typography variant="body2" sx={{ color: '#71717a', mt: 0.5 }}>
                  {formatCohortDate(cohortData.startDate)} to {formatCohortDate(cohortData.endDate)}
                </Typography>
              </>
            )}
          </Box>
          <MuiButton
            variant="contained"
            startIcon={<Eye size={16} />}
            onClick={() => navigate(`/results/${cohortIdParam}`)}
            sx={{
              bgcolor: '#ea580c',
              '&:hover': { bgcolor: '#c2410c' },
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: 'none',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            View Result
          </MuiButton>
        </Box>

        <TableHeader
          // week props
          week={weekIndex}
          selectedWeekId={selectedWeekId}
          weeks={weeks}
          onWeekChange={handleWeekChange}

          // filters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedGroup={selectedGroup}
          onGroupChange={setSelectedGroup}
          selectedTA={selectedTA}
          onTAChange={setSelectedTA}
          attendanceFilter={attendanceFilter}
          onAttendanceFilterChange={setAttendanceFilter}

          // meta
          baseGroups={baseGroups}
          taOptions={taOptions}
          totalCount={totalCount}
          weeklyData={weeklyData}
          onAddNew={() => {
            /* Implement when backend supports create */
          }}
          onDownloadCSV={handleDownloadCSV}
          onAssignGroups={handleAssignGroups}
          onTASelfAssign={handleTASelfAssign}
          onClearFilters={() => {
            setSearchTerm('');
            setSelectedGroup('All Groups');
            setSelectedTA('All TAs');
            setAttendanceFilter('All');
          }}
          navigate={navigate}
          cohortType={cohortData?.type}
          cohortId={cohortIdParam}
          isTA={isTA}
        />

        <StudentTableGrid
          data={sortedFilteredData}
          week={weekIndex}
          weekType={selectedWeekType}
          weekHasExercise={selectedWeekHasExercise}
          cohortType={cohortData?.type}
          sortConfig={sortConfig}
          onSort={setSortConfig}
          onStudentClick={handleStudentClick}
          onEditStudent={handleEditStudent}
          onContextMenu={setContextMenu}
        />

        {showScoreEditModal && selectedStudentForEdit && (
          <ScoreEditModal
            student={selectedStudentForEdit}
            cohortId={cohortData?.id}
            weekId={selectedWeekId}
            week={weekIndex}
            weekType={selectedWeekType}
            weekHasExercise={selectedWeekHasExercise}
            cohortType={cohortData?.type}
            onSubmit={handleScoreUpdate}
            onClose={() => {
              setShowScoreEditModal(false);
              setSelectedStudentForEdit(null);
            }}
          />
        )}

        {/* Assign Groups Modal */}
        <Dialog
          open={showAssignGroupsModal}
          onClose={() => setShowAssignGroupsModal(false)}
          maxWidth="xs"
          fullWidth
          slotProps={{
            backdrop: { sx: { backdropFilter: 'blur(6px)', bgcolor: 'rgba(0,0,0,0.7)' } },
          }}
          PaperProps={{
            sx: { bgcolor: '#1c1c1e', backgroundImage: 'none', borderRadius: 3, border: '1px solid #3f3f46' },
          }}
        >
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 0 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#fafafa' }}>Assign Groups</Typography>
              <Typography variant="body2" sx={{ color: '#a1a1aa', mt: 0.5 }}>Configure group assignment for this week.</Typography>
            </Box>
            <IconButton onClick={() => setShowAssignGroupsModal(false)} size="small" sx={{ color: '#a1a1aa', '&:hover': { color: '#fafafa' } }}>
              <X size={20} />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
              <TextField
                label="Participants Per Group"
                type="number"
                value={participantsPerGroup}
                onChange={(e) => setParticipantsPerGroup(parseInt(e.target.value) || 0)}
                slotProps={{ htmlInput: { min: 1 } }}
                required
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': { bgcolor: '#18181b', color: '#fafafa', '& fieldset': { borderColor: '#52525b' }, '&:hover fieldset': { borderColor: '#f97316' }, '&.Mui-focused fieldset': { borderColor: '#f97316' } },
                  '& .MuiInputLabel-root': { color: '#d4d4d8' },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#f97316' },
                }}
              />
              <TextField
                label="Number of Groups"
                type="number"
                value={groupsAvailable}
                onChange={(e) => setGroupsAvailable(parseInt(e.target.value) || 0)}
                slotProps={{ htmlInput: { min: 1 } }}
                required
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': { bgcolor: '#18181b', color: '#fafafa', '& fieldset': { borderColor: '#52525b' }, '&:hover fieldset': { borderColor: '#f97316' }, '&.Mui-focused fieldset': { borderColor: '#f97316' } },
                  '& .MuiInputLabel-root': { color: '#d4d4d8' },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#f97316' },
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
            <MuiButton onClick={() => setShowAssignGroupsModal(false)} variant="outlined" sx={{ color: '#d4d4d8', borderColor: '#52525b', textTransform: 'none', fontWeight: 600, '&:hover': { borderColor: '#71717a', bgcolor: 'rgba(255,255,255,0.04)' } }}>
              Cancel
            </MuiButton>
            <MuiButton
              onClick={handleAssignGroupsSubmit}
              variant="contained"
              disabled={assignGroupsMutation.isPending}
              sx={{ bgcolor: '#f97316', '&:hover': { bgcolor: '#ea580c' }, textTransform: 'none', fontWeight: 600, boxShadow: 'none', '&.Mui-disabled': { bgcolor: '#78350f', color: '#92400e' } }}
            >
              {assignGroupsMutation.isPending ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Assign Groups'}
            </MuiButton>
          </DialogActions>
        </Dialog>

        {/* TA Self-Assign Modal */}
        {isTA && (
          <Dialog
            open={showTASelfAssignModal}
            onClose={() => setShowTASelfAssignModal(false)}
            maxWidth="xs"
            fullWidth
            slotProps={{
              backdrop: { sx: { backdropFilter: 'blur(6px)', bgcolor: 'rgba(0,0,0,0.7)' } },
            }}
            PaperProps={{
              sx: { bgcolor: '#1c1c1e', backgroundImage: 'none', borderRadius: 3, border: '1px solid #3f3f46' },
            }}
          >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 0 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#fafafa' }}>Assign to Group</Typography>
                <Typography variant="body2" sx={{ color: '#a1a1aa', mt: 0.5 }}>Select a group to assign yourself as TA.</Typography>
              </Box>
              <IconButton onClick={() => setShowTASelfAssignModal(false)} size="small" sx={{ color: '#a1a1aa', '&:hover': { color: '#fafafa' } }}>
                <X size={20} />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
              <TextField
                label="Group Number"
                type="number"
                value={selectedGroupNumber}
                onChange={(e) => setSelectedGroupNumber(parseInt(e.target.value) || 0)}
                slotProps={{ htmlInput: { min: 0, max: 5 } }}
                required
                fullWidth
                sx={{
                  mt: 1,
                  '& .MuiOutlinedInput-root': { bgcolor: '#18181b', color: '#fafafa', '& fieldset': { borderColor: '#52525b' }, '&:hover fieldset': { borderColor: '#f97316' }, '&.Mui-focused fieldset': { borderColor: '#f97316' } },
                  '& .MuiInputLabel-root': { color: '#d4d4d8' },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#f97316' },
                }}
              />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
              <MuiButton onClick={() => setShowTASelfAssignModal(false)} variant="outlined" sx={{ color: '#d4d4d8', borderColor: '#52525b', textTransform: 'none', fontWeight: 600, '&:hover': { borderColor: '#71717a', bgcolor: 'rgba(255,255,255,0.04)' } }}>
                Cancel
              </MuiButton>
              <MuiButton
                onClick={handleTASelfAssignSubmit}
                variant="contained"
                disabled={assignSelfToGroupMutation.isPending}
                sx={{ bgcolor: '#f97316', '&:hover': { bgcolor: '#ea580c' }, textTransform: 'none', fontWeight: 600, boxShadow: 'none', '&.Mui-disabled': { bgcolor: '#78350f', color: '#92400e' } }}
              >
                {assignSelfToGroupMutation.isPending ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Assign to Group'}
              </MuiButton>
            </DialogActions>
          </Dialog>
        )}

        <TableContextMenu
          contextMenu={contextMenu}
          onClose={() => setContextMenu({ visible: false, x: 0, y: 0, targetId: null })}
          onDelete={handleDeleteStudent}
        />
      </Box>
    </Box>
  );
};

export default TableView;
