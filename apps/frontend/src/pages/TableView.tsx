/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { TableHeader } from '../components/table/TableHeader';
import { StudentTableGrid } from '../components/table/StudentTableGrid';
import { ScoreEditModal } from '../components/table/ScoreEditModal';
import { TableContextMenu } from '../components/table/TableContextMenu';

import { computeTotal } from '../utils/calculations';
import type { TableRowData } from '../types/student';

import {
  useScoresForCohortAndWeek,
  useUpdateScoresForUserCohortAndWeek,
  useAssignGroupsForCohortWeek,
} from '../hooks/scoreHooks';
import { useCohort } from '../hooks/cohortHooks';
import { cohortTypeToName, formatCohortDate } from '../helpers/cohortHelpers.ts';
import { getTAForGroup } from '../helpers/taHelpers.ts';

const DEFAULT_GROUPS = ['Group 0', 'Group 1', 'Group 2', 'Group 3', 'Group 4', 'Group 5'];

const TableView: React.FC = () => {
  const navigate = useNavigate();
  const { id: cohortIdParam } = useParams<{ id: string }>();

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
      return {
        id: typeof score.userId === 'number' ? score.userId : idx,
        userId: score.userId, // maintain for API calls
        name: score.name ?? score.discordGlobalName ?? score.discordUsername ?? 'Unknown',
        email: '', // not provided in response
        group: `Group ${groupNumber}`,
        ta: getTAForGroup(groupNumber), // assign TA based on group number
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
          goodDoc: Boolean(score.exerciseScores?.hasGoodDocumentation),
          goodStructure: Boolean(score.exerciseScores?.hasGoodStructure),
        },
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
    if (searchTerm) rows = rows.filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

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
    navigate(`/detailPage?studentId=${studentId}&cohortType=${cohortType}&cohortId=${cohortId}`);
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
                p.id === updated.id ? { ...updated, total: computeTotal(updated) } : p
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

  const handleDeleteStudent = useCallback(() => {
    // TODO: implement delete if backend supports it
  }, []);

  const handleDownloadCSV = useCallback(() => {
    // TODO: add support later
  }, []);

  const handleAssignGroups = useCallback(() => {
    const participantsPerWeek = 8
    const groupsAvailable = 3

    if (isNaN(participantsPerWeek) || isNaN(groupsAvailable) || participantsPerWeek <= 0 || groupsAvailable <= 0) {
      alert('Please enter valid positive numbers');
      return;
    }

    if (confirm('Are you sure you want to assign groups for this week?')) {
      assignGroupsMutation.mutate(
        { weekId: selectedWeekId, cohortId: cohortIdParam, participantsPerWeek, groupsAvailable },
        {
          onSuccess: () => {
            alert('Groups assigned successfully!');
          },
          onError: (error: unknown) => {
            console.error('Group assignment failed', error);
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            alert(`Failed to assign groups: ${message}`);
          },
        }
      );
    }
  }, [selectedWeekId, cohortIdParam, assignGroupsMutation]);

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
          onClearFilters={() => {
            setSearchTerm('');
            setSelectedGroup('All Groups');
            setSelectedTA('All TAs');
            setAttendanceFilter('All');
          }}
          navigate={navigate}
          cohortType={cohortData?.type}
        />

        <StudentTableGrid
          data={sortedFilteredData}
          week={weekIndex}
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
            onSubmit={handleScoreUpdate}
            onClose={() => {
              setShowScoreEditModal(false);
              setSelectedStudentForEdit(null);
            }}
          />
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
