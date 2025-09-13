import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { TableHeader } from '../components/table/TableHeader';
import { StudentTableGrid } from '../components/table/StudentTableGrid';
import { AddStudentModal } from '../components/table/AddStudentModal';
import { TableContextMenu } from '../components/table/TableContextMenu';

import { computeTotal } from '../utils/calculations';
import type { TableRowData } from '../types/student';

const AUTH_TOKEN = import.meta.env.VITE_AUTH_TOKEN;

// Function to get cohort name from database path


// API interface for the table view
interface ApiStudentEntry {
  name: string;
  mail?: string;
  group_id: string;
  ta?: string;
  attendance?: string;
  fa?: number;
  fb?: number;
  fc?: number;
  fd?: number;
  bonus_attempt?: number;
  bonus_answer_quality?: number;
  bonus_follow_up?: number;
  exercise_submitted?: string;
  exercise_test_passing?: string;
  exercise_good_documentation?: string;
  exercise_good_structure?: string;
  week: number;
  total?: number;
}

const TableView: React.FC = () => {
  // --- STATE MANAGEMENT ---
  const [data, setData] = useState<TableRowData[]>([]);
  const [editedRows, setEditedRows] = useState<TableRowData[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [week, setWeek] = useState(0);
  
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
  const canEditFields = isEditing && week !== 0;
  const canEditAttendance = isEditing;
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  // --- DATA FETCHING ---
  const fetchWeeklyData = useCallback((selectedWeek: number) => {
    fetch(`${baseUrl}/weekly_data/${cohort_name}/${selectedWeek}`, {
      headers: { Authorization: `${AUTH_TOKEN}` },
    })
      .then(response => {
        if (!response.ok) {
          return response.text().then(text => {
            let errorDetail = text;
            try {
              const jsonError = JSON.parse(text);
              errorDetail = jsonError.message || text;
            } catch {
              /* ignore */
            }
            throw new Error(
              `Server error: ${response.status} - ${errorDetail}`
            );
          });
        }
        return response.json();
      })
      .then((apiData: ApiStudentEntry[]) => {
        const formattedData = apiData.map((person, index) => {
          const gdScore = {
            fa: person.fa || 0,
            fb: person.fb || 0,
            fc: person.fc || 0,
            fd: person.fd || 0,
          };
          const bonusScore = {
            attempt: person.bonus_attempt || 0,
            good: person.bonus_answer_quality || 0,
            followUp: person.bonus_follow_up || 0,
          };
          const exerciseScore = {
            Submitted: person.exercise_submitted === 'yes',
            privateTest: person.exercise_test_passing === 'yes',
            goodStructure: person.exercise_good_structure === 'yes',
            goodDoc: person.exercise_good_documentation === 'yes',
          };
          const rowDataShape: Omit<TableRowData, 'id' | 'total'> = {
            name: person.name,
            email: person.mail || '',
            group: person.group_id,
            ta: person.ta || 'N/A',
            attendance: person.attendance === 'yes',
            gdScore,
            bonusScore,
            exerciseScore,
            week: selectedWeek,
          };
          const rowData: TableRowData = {
            id: index + 1,
            ...rowDataShape,
            total: computeTotal(rowDataShape),
          };
          return rowData;
        });
        setData(formattedData);
      })
      .catch(error => {
        console.error(`Error fetching data for week ${selectedWeek}:`, error);
        setData([]);
      });
  }, []);

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
  }, []);

  useEffect(() => {
    fetchWeeklyData(week);
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
  const handleWeekChange = (newWeek: number) => {
    setWeek(newWeek);
    setIsEditing(false);
    setContextMenu({ visible: false, x: 0, y: 0, targetId: null });
    setEditedRows([]);
  };

  const handleStudentClick = (studentName: string) => {
    localStorage.setItem('user_username', studentName);
    navigate(`/detailPage?student=${encodeURIComponent(studentName)}`);
  };

  const handleDataUpdate = (updatedData: TableRowData[]) => {
    setData(updatedData);
  };

  const handleEditedRowsUpdate = (updatedRows: TableRowData[]) => {
    setEditedRows(prevEditedRows => {
      const existingIds = new Set(prevEditedRows.map(row => row.id));
      const newRows = updatedRows.filter(row => !existingIds.has(row.id));
      const updatedExistingRows = prevEditedRows.map(existingRow => {
        const updatedRow = updatedRows.find(row => row.id === existingRow.id);
        return updatedRow || existingRow;
      });
      return [...updatedExistingRows, ...newRows];
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    const payload = editedRows.map(p => ({
      name: p.name,
      mail: p.email,
      attendance: p.attendance ? 'yes' : 'no',
      week: p.week ?? week,
      group_id: p.group,
      ta: p.ta === 'N/A' ? undefined : p.ta,
      fa: p.gdScore.fa,
      fb: p.gdScore.fb,
      fc: p.gdScore.fc,
      fd: p.gdScore.fd,
      bonus_attempt: p.bonusScore.attempt,
      bonus_answer_quality: p.bonusScore.good,
      bonus_follow_up: p.bonusScore.followUp,
      exercise_submitted: p.exerciseScore.Submitted ? 'yes' : 'no',
      exercise_test_passing: p.exerciseScore.privateTest ? 'yes' : 'no',
      exercise_good_documentation: p.exerciseScore.goodDoc ? 'yes' : 'no',
      exercise_good_structure: p.exerciseScore.goodStructure ? 'yes' : 'no',
      total: computeTotal(p),
    }));

    fetch(`${baseUrl}/weekly_data/${cohort_name}/${week}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(r => {
        if (!r.ok) {
          return r.text().then(text => {
            throw new Error(text || r.statusText);
          });
        }
        setIsEditing(false);
        setEditedRows([]);
        getWeeklyData(week);
        return r.json();
      })
      .catch(e => {
        console.error('Save failed', e);
        if (e.message && e.message.includes('No student data provided')) {
          console.log('No changes to save.');
          setIsEditing(false);
        }
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
      exercise_good_documentation: studentData.exerciseScore.goodDoc
        ? 'yes'
        : 'no',
      exercise_good_structure: studentData.exerciseScore.goodStructure
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
        fetchWeeklyData(week);
        setShowAddStudentModal(false);
        setIsEditing(false);
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
      exercise_good_documentation: rowToDelete.exerciseScore.goodDoc
        ? 'yes'
        : 'no',
      exercise_good_structure: rowToDelete.exerciseScore.goodStructure
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
          isEditing={isEditing}
          onEdit={() => setIsEditing(true)}
          onSave={handleSave}
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
          canEditFields={canEditFields}
          canEditAttendance={canEditAttendance}
          sortConfig={sortConfig}
          onSort={setSortConfig}
          onStudentClick={handleStudentClick}
          onDataUpdate={handleDataUpdate}
          onEditedRowsUpdate={handleEditedRowsUpdate}
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