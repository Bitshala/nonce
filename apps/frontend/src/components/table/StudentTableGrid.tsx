import React, { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  Typography,
  Box,
} from '@mui/material';
import { StudentRow } from './StudentRow';
import type { TableRowData } from '../../types/student';

interface StudentTableGridProps {
  data: TableRowData[];
  week: number;
  cohortType?: string;
  sortConfig: {
    key: keyof TableRowData | null;
    direction: 'ascending' | 'descending';
  };
  onSort: (config: { key: keyof TableRowData | null; direction: 'ascending' | 'descending' }) => void;
  onStudentClick: (student: TableRowData) => void;
  onEditStudent: (student: TableRowData) => void;
  onContextMenu: (menu: { visible: boolean; x: number; y: number; targetId: number | null }) => void;
}

const headerSx = {
  backgroundColor: '#fed7aa',
  color: '#3f3f46',
  fontWeight: 600,
  fontSize: '0.75rem',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  borderBottom: '1px solid #e4e4e7',
  whiteSpace: 'nowrap' as const,
};

export const StudentTableGrid: React.FC<StudentTableGridProps> = ({
  data,
  week,
  cohortType,
  sortConfig,
  onSort,
  onStudentClick,
  onEditStudent,
  onContextMenu,
}) => {
  const isOrientation = week === 0;
  const showExerciseScores = cohortType !== 'MASTERING_BITCOIN';

  // Determine which score columns to show based on whether any row has data
  // For week 0 (Orientation), only show attendance — hide GD, Bonus, Exercise
  const hasGdScores = useMemo(() => !isOrientation && data.some(d => d.gdScore !== null), [data, isOrientation]);
  const hasBonusScores = useMemo(() => !isOrientation && data.some(d => d.bonusScore !== null), [data, isOrientation]);
  const hasExerciseScores = useMemo(
    () => !isOrientation && showExerciseScores && data.some(d => d.exerciseScore !== null),
    [data, showExerciseScores, isOrientation]
  );

  const requestSort = (key: keyof TableRowData) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    onSort({ key, direction });
  };

  const getSortDirection = (key: keyof TableRowData): 'asc' | 'desc' | undefined => {
    if (sortConfig.key !== key) return undefined;
    return sortConfig.direction === 'ascending' ? 'asc' : 'desc';
  };

  return (
    <Paper
      elevation={3}
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid #e4e4e7',
      }}
    >
      <TableContainer>
        <Table stickyHeader sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell
                sx={{ ...headerSx, cursor: 'pointer', '&:hover': { backgroundColor: '#fff7ed' }, position: 'sticky', top: 0, zIndex: 3 }}
                onClick={() => requestSort('name')}
              >
                <TableSortLabel
                  active={sortConfig.key === 'name'}
                  direction={getSortDirection('name') || 'asc'}
                  sx={{
                    color: 'inherit !important',
                    '& .MuiTableSortLabel-icon': { color: '#3f3f46 !important' },
                  }}
                >
                  Name
                </TableSortLabel>
              </TableCell>

              <TableCell
                sx={{
                  ...headerSx,
                  position: 'sticky', top: 0, zIndex: 3,
                  display: { xs: 'none', sm: 'table-cell' },
                }}
              >
                Discord Name
              </TableCell>

              {week > 0 && (
                <TableCell
                  sx={{
                    ...headerSx,
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: '#fff7ed' },
                    position: 'sticky', top: 0, zIndex: 3,
                    display: { xs: 'none', sm: 'table-cell' },
                  }}
                  onClick={() => requestSort('group')}
                >
                  <TableSortLabel
                    active={sortConfig.key === 'group'}
                    direction={getSortDirection('group') || 'asc'}
                    sx={{
                      color: 'inherit !important',
                      '& .MuiTableSortLabel-icon': { color: '#3f3f46 !important' },
                    }}
                  >
                    Group
                  </TableSortLabel>
                </TableCell>
              )}

              <TableCell
                sx={{
                  ...headerSx,
                  position: 'sticky', top: 0, zIndex: 3,
                  display: { xs: 'none', md: 'table-cell' },
                }}
              >
                TA
              </TableCell>

              {hasGdScores && (
                <TableCell
                  sx={{
                    ...headerSx,
                    position: 'sticky', top: 0, zIndex: 3,
                    display: { xs: 'none', lg: 'table-cell' },
                  }}
                >
                  Attendance
                </TableCell>
              )}

              {hasGdScores && (
                <TableCell
                  align="center"
                  sx={{ ...headerSx, position: 'sticky', top: 0, zIndex: 3 }}
                >
                  GD Score
                </TableCell>
              )}

              {hasBonusScores && (
                <TableCell
                  align="center"
                  sx={{ ...headerSx, position: 'sticky', top: 0, zIndex: 3 }}
                >
                  Bonus
                </TableCell>
              )}

              {hasExerciseScores && (
                <TableCell
                  align="center"
                  sx={{ ...headerSx, position: 'sticky', top: 0, zIndex: 3 }}
                >
                  Exercise
                </TableCell>
              )}

              <TableCell
                align="center"
                sx={{
                  ...headerSx,
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: '#fff7ed' },
                  position: 'sticky', top: 0, zIndex: 3,
                }}
                onClick={() => requestSort('total')}
              >
                <TableSortLabel
                  active={sortConfig.key === 'total'}
                  direction={getSortDirection('total') || 'asc'}
                  sx={{
                    color: 'inherit !important',
                    '& .MuiTableSortLabel-icon': { color: '#3f3f46 !important' },
                  }}
                >
                  Total
                </TableSortLabel>
              </TableCell>

              <TableCell
                align="center"
                sx={{ ...headerSx, position: 'sticky', top: 0, zIndex: 3 }}
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {data.map(person => (
              <StudentRow
                key={person.id}
                person={person}
                week={week}
                showGdScores={hasGdScores}
                showBonusScores={hasBonusScores}
                showExerciseScores={hasExerciseScores}
                onStudentClick={onStudentClick}
                onEditStudent={onEditStudent}
                onContextMenu={onContextMenu}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {data.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 5 }}>
          <Typography color="text.secondary">No data available.</Typography>
        </Box>
      )}
    </Paper>
  );
};
