/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';

import { TableHeader } from '../components/table/TableHeader';
import { StudentTableGrid } from '../components/table/StudentTableGrid';
import { ScoreEditModal } from '../components/table/ScoreEditModal';
import { TableContextMenu } from '../components/table/TableContextMenu';
import { Modal, InputField, Button, ModalRow } from '../components/Modal';

import { computeTotal, cohortHasExercises } from '../utils/calculations';
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
import apiService from '../services/apiService';

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

      return {
        id: typeof score.userId === 'number' ? score.userId : idx,
        userId: score.userId, // maintain for API calls
        name: score.name ?? score.discordGlobalName ?? score.discordUsername ?? 'Unknown',
        email: score.discordUsername ?? '', // discord username
        userEmail: '',
        group: `Group ${groupNumber}`,
        ta: taName,
        attendance: Boolean(score.groupDiscussionScores?.attendance),
        gdScore: {
          fa: score.groupDiscussionScores?.communicationScore ?? 0,
          fb: score.groupDiscussionScores?.depthOfAnswerScore ?? 0,
          fc: score.groupDiscussionScores?.technicalBitcoinFluencyScore ?? 0,
          fd: score.groupDiscussionScores?.engagementScore ?? 0,
        },
        bonusScore: {
          attempt: score.groupDiscussionScores?.isBonusAttempted ? 1 : 0,
          good: score.groupDiscussionScores?.bonusAnswerScore ?? 0,
          followUp: score.groupDiscussionScores?.bonusFollowupScore ?? 0,
        },
        exerciseScore: {
          Submitted: Boolean(score.exerciseScores?.isSubmitted),
          privateTest: Boolean(score.exerciseScores?.isPassing),
        },
        week: weekIndex,
        total: score.totalScore ?? 0,
      };
    });

    setData(transformed);
    setTotalCount(scoresData.scores.length);
    setWeeklyData({week: weekIndex, attended: transformed.filter(s => s.attendance).length});
  }, [scoresData, scoresError, weekIndex]);

  // === Fetch user emails ===
  const userIds = useMemo(
    () => (scoresData?.scores ?? []).map((s: any) => String(s.userId)).filter(Boolean),
    [scoresData],
  );

  const userQueries = useQueries({
    queries: userIds.map((uid) => ({
      queryKey: ['user', uid],
      queryFn: () => apiService.getUserById(uid),
      staleTime: 10 * 60 * 1000,
      enabled: userIds.length > 0,
    })),
  });

  const emailMap = useMemo(() => {
    const map: Record<string, string> = {};
    userIds.forEach((uid, i) => {
      const result = userQueries[i];
      if (result?.data?.email) {
        map[uid] = result.data.email;
      }
    });
    return map;
  }, [userIds, userQueries]);

  // Merge emails into table data when available
  useEffect(() => {
    if (Object.keys(emailMap).length === 0) return;
    setData((prev) =>
      prev.map((row) => {
        const uid = String(row.userId ?? row.id);
        const email = emailMap[uid];
        if (email && email !== row.userEmail) {
          return { ...row, userEmail: email };
        }
        return row;
      }),
    );
  }, [emailMap]);

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
      p.email.toLowerCase().includes(searchTerm.toLowerCase())
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
    const studentEmail = encodeURIComponent(student.email || 'N/A');
    navigate(`/detailPage?studentId=${studentId}&cohortType=${cohortType}&cohortId=${cohortId}&studentName=${studentName}&studentEmail=${studentEmail}&from=table`);
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
        communicationScore: updated.gdScore.fa,
        depthOfAnswerScore: updated.gdScore.fb,
        technicalBitcoinFluencyScore: updated.gdScore.fc,
        engagementScore: updated.gdScore.fd,
        isBonusAttempted: updated.bonusScore.attempt > 0,
        bonusAnswerScore: updated.bonusScore.good,
        bonusFollowupScore: updated.bonusScore.followUp,
        isSubmitted: updated.exerciseScore.Submitted,
        isPassing: updated.exerciseScore.privateTest,
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
                p.id === updated.id ? { ...updated, total: computeTotal(updated, cohortHasExercises(cohortData?.type || '')) } : p
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
    // TODO: add support later
  }, []);

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

  // === Cohort Header (dynamic title) ===
  const cohortTitleBlock = useMemo(() => {
    // Prefer backend-sourced cohort metadata
    if (cohortData) {
      return (
        <>
          <h1>{`${cohortTypeToName(cohortData.type)} - Season ${cohortData.season}`}</h1>
          <h2 className="font-light">{`${formatCohortDate(cohortData.startDate)} to ${formatCohortDate(cohortData.endDate)}`}</h2>
        </>
      );
    }
  }, [cohortData]);

  // === Loading & error states ===
  if (isCohortLoading || isScoresLoading || isScoresPending) {
    return (
      <div className="p-6 bg-zinc-900 text-zinc-300/90 min-h-screen">
        <div className="max-w-full mx-auto">Loading cohort…</div>
      </div>
    );
  }

  if (cohortError) {
    return (
      <div className="p-6 bg-zinc-900 text-red-400 min-h-screen">
        <div className="max-w-full mx-auto">Failed to load cohort.</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-zinc-900 text-zinc-300/90 min-h-screen">
      <div className="max-w-full mx-auto">
        <div className="flex justify-between items-center mb-4">
          <div>{cohortTitleBlock}</div>
          <button
            onClick={() => navigate(`/results/${cohortIdParam}`)}
            className="border-0 px-4 py-3 bg-orange-400 hover:bg-orange-700 text-white rounded-lg transition-colors duration-200 font-semibold"
          >
            View Result
          </button>
        </div>

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
            cohortType={cohortData?.type}
            onSubmit={handleScoreUpdate}
            onClose={() => {
              setShowScoreEditModal(false);
              setSelectedStudentForEdit(null);
            }}
          />
        )}

        <Modal
            isOpen={showAssignGroupsModal}
            onClose={() => setShowAssignGroupsModal(false)}
            title="Assign Groups"
            description="Configure the group assignment settings for this week."
            size="sm"
            footer={
              <>
                <Button
                  variant="secondary"
                  onClick={() => setShowAssignGroupsModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleAssignGroupsSubmit}
                  loading={assignGroupsMutation.isPending}
                >
                  Assign Groups
                </Button>
              </>
            }
          >
            <ModalRow>
              <InputField
                label="Participants Per Group"
                name="participantsPerGroup"
                type="number"
                value={participantsPerGroup}
                onChange={(e) => setParticipantsPerGroup(parseInt(e.target.value) || 0)}
                min={1}
                required
                placeholder="8"
              />
              <InputField
                label="Number of Groups"
                name="groupsAvailable"
                type="number"
                value={groupsAvailable}
                onChange={(e) => setGroupsAvailable(parseInt(e.target.value) || 0)}
                min={1}
                required
                placeholder="3"
              />
            </ModalRow>
          </Modal>

        {isTA && (
          <Modal
            isOpen={showTASelfAssignModal}
            onClose={() => setShowTASelfAssignModal(false)}
            title="Assign Yourself to a Group"
            description="Select a group number to assign yourself as a TA for this week."
            size="sm"
            footer={
              <>
                <Button
                  variant="secondary"
                  onClick={() => setShowTASelfAssignModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleTASelfAssignSubmit}
                  loading={assignSelfToGroupMutation.isPending}
                >
                  Assign to Group
                </Button>
              </>
            }
          >
            <ModalRow>
              <InputField
                label="Group Number"
                name="groupNumber"
                type="number"
                value={selectedGroupNumber}
                onChange={(e) => setSelectedGroupNumber(parseInt(e.target.value) || 0)}
                min={0}
                max={5}
                required
                placeholder="0"
              />
            </ModalRow>
          </Modal>
        )}

        <TableContextMenu
          contextMenu={contextMenu}
          onClose={() => setContextMenu({ visible: false, x: 0, y: 0, targetId: null })}
          onDelete={handleDeleteStudent}
        />
      </div>
    </div>
  );
};

export default TableView;
