import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { TableHeader } from '../components/table/TableHeader';
import { StudentTableGrid } from '../components/table/StudentTableGrid';
import { AddStudentModal } from '../components/table/AddStudentModal';
import { ScoreEditModal } from '../components/table/ScoreEditModal';
import { TableContextMenu } from '../components/table/TableContextMenu';

import { computeTotal } from '../utils/calculations';
import type { TableRowData } from '../types/student';



const TableView: React.FC = () => {
  // --- STATE MANAGEMENT ---
  const [data, setData] = useState<TableRowData[]>([]);
  const [week, setWeek] = useState(0);
  const [selectedWeekId, setSelectedWeekId] = useState<string>('');
  
  // Get cohort name from localStorage
  const cohort_name = localStorage.getItem('selected_cohort_db_path') || 'lbtcl_cohort.db';
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{
    key: keyof TableRowData | null;
    direction: 'ascending' | 'descending';
  }>({ key: null, direction: 'ascending' });
  const [selectedGroup, setSelectedGroup] = useState<string>('All Groups');
  const [selectedTA, setSelectedTA] = useState<string>('All TAs');
  const [attendanceFilter, setAttendanceFilter] = useState<
    'All' | 'Present' | 'Absent'
  >('All');
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showScoreEditModal, setShowScoreEditModal] = useState(false);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<TableRowData | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    targetId: number | null;
  }>({ visible: false, x: 0, y: 0, targetId: null });
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [weeklyData, setWeeklyData] = useState<{
    week: number;
    attended: number;
  }>({ week: 0, attended: 0 });

  const navigate = useNavigate();
  const baseGroups = useMemo(
    () => ['Group 0', 'Group 1', 'Group 2', 'Group 3', 'Group 4', 'Group 5'],
    []
  );
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  // --- DATA FETCHING ---

  const cohortData = JSON.parse(localStorage.getItem('selected_cohort_full') || '{}');
  const weeks = useMemo(() => cohortData.weeks || [], [cohortData.weeks]);
  const currentWeekId = selectedWeekId || (weeks.length > 0 ? weeks[0].id : '');
  const token = localStorage.getItem('user_session_token');

  // Initialize selectedWeekId if not set
  useEffect(() => {
    if (!selectedWeekId && weeks.length > 0) {
      setSelectedWeekId(weeks[0].id);
    }
  }, [selectedWeekId, weeks]);

  const fetchWeeklyData = useCallback(() => {
    fetch(`https://undedicated-clarine-peskily.ngrok-free.dev/scores/cohort/${cohortData.id}/week/${currentWeekId}`, {
        headers: {
          Authorization: `Bearer ${token}`, // IMPORTANT: Bearer prefix
          Accept: 'application/json',
        },
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(`Error fetching data: ${res.statusText}`);
        }
        return res.json();
      })
      .then(apiResponse => {
        if (apiResponse.scores && Array.isArray(apiResponse.scores)) {
          const transformedData: TableRowData[] = apiResponse.scores.map((score: {
            weekId: string;
            groupDiscussionScores?: {
              attendance?: boolean;
              communicationScore?: number;
              depthOfAnswerScore?: number;
              technicalBitcoinFluencyScore?: number;
              engagementScore?: number;
              isBonusAttempted?: boolean;
              bonusAnswerScore?: number;
              bonusFollowupScore?: number;
            };
            exerciseScores?: {
              isSubmitted?: boolean;
              isPassing?: boolean;
              hasGoodDocumentation?: boolean;
              hasGoodStructure?: boolean;
            };
            totalScore?: number;
            name?: string;
            discordGlobalName?: string;
            discordUsername?: string;
          }, index: number) => ({
            id: apiResponse.scores[0].userId || index, // Fallback to index if userId is missing
            name: score.name || score.discordGlobalName || score.discordUsername || 'Unknown',
            email: '', // Not provided in API response
            group: 'Group 0', // Default, would need to come from another field
            ta: 'N/A', // Not provided in API response
            attendance: score.groupDiscussionScores?.attendance || false,
            gdScore: {
              fa: score.groupDiscussionScores?.communicationScore || 0,
              fb: score.groupDiscussionScores?.depthOfAnswerScore || 0,
              fc: score.groupDiscussionScores?.technicalBitcoinFluencyScore || 0,
              fd: score.groupDiscussionScores?.engagementScore || 0,
            },
            bonusScore: {
              attempt: score.groupDiscussionScores?.isBonusAttempted ? 1 : 0,
              good: score.groupDiscussionScores?.bonusAnswerScore || 0,
              followUp: score.groupDiscussionScores?.bonusFollowupScore || 0,
            },
            exerciseScore: {
              Submitted: score.exerciseScores?.isSubmitted || false,
              privateTest: score.exerciseScores?.isPassing || false,
              goodDoc: score.exerciseScores?.hasGoodDocumentation || false,
              goodStructure: score.exerciseScores?.hasGoodStructure || false,
            },
            week: week,
            total: score.totalScore || 0,
          }));
          setData(transformedData);
        }
      })
      .catch(err => {
        console.error('Error fetching weekly data:', err);
        setData([]);
      });
  }, [cohortData.id, currentWeekId, token, week]);

  const getWeeklyData = useCallback((week: number) => {
    fetch(`${baseUrl}/attendance/weekly_counts/${week}`)
      .then(res => res.json())
      .then(apiData => {
        if (Array.isArray(apiData)) {
          const currentWeekData = apiData.find(wd => wd.week === week);
          setWeeklyData(currentWeekData || { week: week, attended: 0 });
        } else if (
          apiData &&
          typeof apiData === 'object' &&
          apiData.week !== undefined
        ) {
          setWeeklyData(apiData);
        } else {
          setWeeklyData({ week: week, attended: 0 });
        }
      })
      .catch(err => {
        console.error('Error fetching weekly attendance:', err);
        setWeeklyData({ week: week, attended: 0 });
      });
  }, [baseUrl]);

  useEffect(() => {
    fetchWeeklyData();
    getWeeklyData(week);
  }, [fetchWeeklyData, getWeeklyData, week]);

  useEffect(() => {
    fetch(`${baseUrl}/count/students`)
      .then(res => res.json())
      .then(data => setTotalCount(data.count))
      .catch(err => console.error('Error fetching total count:', err));
  }, [baseUrl]);

  // --- COMPUTED DATA ---
  const taOptions = useMemo(() => {
    if (!data || data.length === 0) return ['All TAs'];
    const uniqueTAs = new Set(
      data.map(person => person.ta).filter(ta => ta && ta !== 'N/A')
    );
    return ['All TAs', ...Array.from(uniqueTAs).sort()];
  }, [data]);

  const processedData = useMemo(() => {
    let filteredData = [...data];
    if (selectedGroup !== 'All Groups')
      filteredData = filteredData.filter(p => p.group === selectedGroup);
    if (selectedTA !== 'All TAs')
      filteredData = filteredData.filter(p => p.ta === selectedTA);
    if (attendanceFilter === 'Present')
      filteredData = filteredData.filter(p => p.attendance === true);
    else if (attendanceFilter === 'Absent')
      filteredData = filteredData.filter(p => p.attendance === false);
    if (searchTerm)
      filteredData = filteredData.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

    if (sortConfig.key) {
      filteredData.sort((a, b) => {
        const aValue = a[sortConfig.key!];
        const bValue = b[sortConfig.key!];
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          if (aValue.toLowerCase() < bValue.toLowerCase())
            return sortConfig.direction === 'ascending' ? -1 : 1;
          if (aValue.toLowerCase() > bValue.toLowerCase())
            return sortConfig.direction === 'ascending' ? 1 : -1;
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'ascending'
            ? aValue - bValue
            : bValue - aValue;
        } else if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
          return sortConfig.direction === 'ascending'
            ? aValue === bValue
              ? 0
              : aValue
                ? -1
                : 1
            : aValue === bValue
              ? 0
              : aValue
                ? 1
                : -1;
        }
        return 0;
      });
    }
    return filteredData;
  }, [
    data,
    searchTerm,
    sortConfig,
    selectedGroup,
    selectedTA,
    attendanceFilter,
  ]);

  // --- EVENT HANDLERS ---
  const handleWeekChange = (newWeek: number, weekId: string) => {
    setWeek(newWeek);
    setSelectedWeekId(weekId);
    setContextMenu({ visible: false, x: 0, y: 0, targetId: null });
  };

  const handleStudentClick = (studentName: string) => {
    localStorage.setItem('user_username', studentName);
    navigate(`/detailPage?student=${encodeURIComponent(studentName)}`);
  };

  const handleEditStudent = (student: TableRowData) => {
    setSelectedStudentForEdit(student);
    setShowScoreEditModal(true);
  };

  const handleScoreUpdate = (updatedStudent: TableRowData) => {
    if (!selectedStudentForEdit) return;

    const payload = {
      attendance: updatedStudent.attendance,
      communicationScore: updatedStudent.gdScore.fa,
      depthOfAnswerScore: updatedStudent.gdScore.fb,
      technicalBitcoinFluencyScore: updatedStudent.gdScore.fc,
      engagementScore: updatedStudent.gdScore.fd,
      isBonusAttempted: updatedStudent.bonusScore.attempt > 0,
      bonusAnswerScore: updatedStudent.bonusScore.good,
      bonusFollowupScore: updatedStudent.bonusScore.followUp,
      isSubmitted: updatedStudent.exerciseScore.Submitted,
      isPassing: updatedStudent.exerciseScore.privateTest,
    };

    // Extract userId from the selected student data
    const userId = selectedStudentForEdit.id; // This should be the actual userId from the API

    fetch(`https://undedicated-clarine-peskily.ngrok-free.dev/scores/user/${userId}/cohort/${cohortData.id}/week/${currentWeekId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
      .then(r => {
        if (r.status === 200) {
          // Success - update local data
          setData(prevData =>
            prevData.map(p =>
              p.id === updatedStudent.id ? { ...updatedStudent, total: computeTotal(updatedStudent) } : p
            )
          );
          setShowScoreEditModal(false);
          setSelectedStudentForEdit(null);
    
        } else {
          // Error - show error message
          return r.text().then(text => {
            throw new Error(text || `Error ${r.status}: ${r.statusText}`);
          });
        }
      })
      .catch(e => {
        console.error('Score update failed', e);
        alert(`Failed to update scores: ${e.message}`);
      });
  };

  const handleAddStudent = (
    studentData: Omit<TableRowData, 'id' | 'total' | 'week'>
  ) => {
    const payload = {
      name: studentData.name,
      mail: studentData.email,
      attendance: studentData.attendance ? 'yes' : 'no',
      week: week,
      group_id: studentData.group,
      ta: studentData.ta === 'N/A' ? undefined : studentData.ta,
      fa: studentData.gdScore.fa,
      fb: studentData.gdScore.fb,
      fc: studentData.gdScore.fc,
      fd: studentData.gdScore.fd,
      bonus_attempt: studentData.bonusScore.attempt,
      bonus_answer_quality: studentData.bonusScore.good,
      bonus_follow_up: studentData.bonusScore.followUp,
      exercise_submitted: studentData.exerciseScore.Submitted ? 'yes' : 'no',
      exercise_test_passing: studentData.exerciseScore.privateTest
        ? 'yes'
        : 'no',
      total: computeTotal(studentData),
    };

    fetch(`${baseUrl}/students/${cohort_name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(r => {
        if (!r.ok) throw new Error(r.statusText);
        fetchWeeklyData();
        setShowAddStudentModal(false);
        getWeeklyData(week);
        return r.text();
      })
      .catch(e => console.error('Add student failed', e));
  };

  const handleDeleteStudent = (studentId: number) => {
    const rowToDelete = data.find(p => p.id === studentId);
    if (!rowToDelete) {
      console.error('Could not find row to delete in frontend state.');
      return;
    }

    const payload = {
      name: rowToDelete.name,
      mail: rowToDelete.email,
      week: rowToDelete.week ?? week,
      group_id: rowToDelete.group,
      ta: rowToDelete.ta === 'N/A' ? undefined : rowToDelete.ta,
      attendance: rowToDelete.attendance ? 'yes' : 'no',
      fa: rowToDelete.gdScore.fa,
      fb: rowToDelete.gdScore.fb,
      fc: rowToDelete.gdScore.fc,
      fd: rowToDelete.gdScore.fd,
      bonus_attempt: rowToDelete.bonusScore.attempt,
      bonus_answer_quality: rowToDelete.bonusScore.good,
      bonus_follow_up: rowToDelete.bonusScore.followUp,
      exercise_submitted: rowToDelete.exerciseScore.Submitted ? 'yes' : 'no',
      exercise_test_passing: rowToDelete.exerciseScore.privateTest
        ? 'yes'
        : 'no',
      total: computeTotal(rowToDelete),
    };

    fetch(`${baseUrl}/del/${cohort_name}/${week}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(response => {
        if (!response.ok) {
          return response.text().then(text => {
            throw new Error(text || response.statusText);
          });
        }
        setData(prevData => prevData.filter(p => p.id !== studentId));
        getWeeklyData(week);
      })
      .catch(e => console.error('Delete failed:', e));
  };

  const handleDownloadCSV = () => {
    const headers = [
      'Name',
      'Email',
      'Group',
      'TA',
      'Attendance',
      'fa',
      'fb',
      'fc',
      'fd',
      'Bonus_Attempt',
      'Bonus_Good',
      'Bonus_FollowUp',
      'Submitted',
      'PrivateTest',
      'GoodStructure',
      'GoodDoc',
      'Total',
      'Week',
    ];

    const rows = data.map(p => [
      p.name,
      p.email || '',
      p.group,
      p.ta || '',
      p.attendance ? 'yes' : 'no',
      p.gdScore.fa,
      p.gdScore.fb,
      p.gdScore.fc,
      p.gdScore.fd,
      p.bonusScore.attempt,
      p.bonusScore.good,
      p.bonusScore.followUp,
      p.exerciseScore.Submitted ? 'yes' : 'no',
      p.exerciseScore.privateTest ? 'yes' : 'no',
      p.exerciseScore.goodStructure ? 'yes' : 'no',
      p.exerciseScore.goodDoc ? 'yes' : 'no',
      computeTotal(p),
      p.week ?? week,
    ]);

    const csvContent = [headers, ...rows]
      .map(row =>
        row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
      )
      .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `cohort-week-${week}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-zinc-900 text-zinc-300/90 min-h-screen">
      <div className="max-w-full mx-auto">
            {
          cohort_name == 'pb_cohort.db' ? (
              <><h1>Programming Bitcoin Study Cohort</h1><h2 className="font-light">8th Aug - 12th Sep</h2><h2 className="font-light">Github Classroom Master Repository</h2><h3>Cohort Participants</h3></>
          ) 
          : cohort_name == 'mb_cohort.db' ? (
              <><h1>Mastering Bitcoin</h1><h2 className="font-light">18th Sep - 16th Oct</h2><h2 className="font-light">Github Classroom Master Repository</h2><h3>Cohort Participants</h3></>
          )
          : (
               <><h1>Learning Bitcoin From Command Line</h1><h2 className="font-light">30th May - 27th july</h2><h2 className="font-light">Github Classroom Master Repository</h2><h3>Cohort Participants</h3></>
          )
        }


        <TableHeader
          week={week}
          selectedWeekId={selectedWeekId}
          weeks={weeks}
          onWeekChange={handleWeekChange}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedGroup={selectedGroup}
          onGroupChange={setSelectedGroup}
          selectedTA={selectedTA}
          onTAChange={setSelectedTA}
          attendanceFilter={attendanceFilter}
          onAttendanceFilterChange={setAttendanceFilter}
          baseGroups={baseGroups}
          taOptions={taOptions}
          totalCount={totalCount}
          weeklyData={weeklyData}
          onAddNew={() => setShowAddStudentModal(true)}
          onDownloadCSV={handleDownloadCSV}
          onClearFilters={() => {
            setSearchTerm('');
            setSelectedGroup('All Groups');
            setSelectedTA('All TAs');
            setAttendanceFilter('All');
          }}
          navigate={navigate}
        />

        <StudentTableGrid
          data={processedData}
          week={week}
          sortConfig={sortConfig}
          onSort={setSortConfig}
          onStudentClick={handleStudentClick}
          onEditStudent={handleEditStudent}
          onContextMenu={setContextMenu}
        />

        {showAddStudentModal && (
          <AddStudentModal
            baseGroups={baseGroups}
            week={week}
            onSubmit={handleAddStudent}
            onClose={() => setShowAddStudentModal(false)}
          />
        )}

        {showScoreEditModal && selectedStudentForEdit && (
          <ScoreEditModal
            student={selectedStudentForEdit}
            cohortId={cohortData.id}
            weekId={currentWeekId}
            onSubmit={handleScoreUpdate}
            onClose={() => {
              setShowScoreEditModal(false);
              setSelectedStudentForEdit(null);
            }}
          />
        )}

        <TableContextMenu
          contextMenu={contextMenu}
          onClose={() =>
            setContextMenu({ visible: false, x: 0, y: 0, targetId: null })
          }
          onDelete={handleDeleteStudent}
        />
      </div>
    </div>
  );
};

export default TableView;