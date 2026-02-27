import { useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Button,
  Chip,
} from '@mui/material';
import { ArrowLeft, Medal, Crown, Flame } from 'lucide-react';

import { useCohort } from '../hooks/cohortHooks';
import { useCohortLeaderboard } from '../hooks/scoreHooks';
import { useUser } from '../hooks/userHooks';

import { UserRole } from '../types/enums';
import {
  type StudentResult,
  transformLeaderboardData,
  sortResults,
  formatCohortName,
  getErrorMessage,
} from '../utils/resultHelper';
import { cohortHasExercises } from '../utils/calculations';

const getScoreColor = (score: number): string => {
  if (score >= 90) return '#4ade80';
  if (score >= 80) return '#facc15';
  return '#f87171';
};

const RANK_HIGHLIGHT: Record<number, { color: string; bg: string; border: string; label: string }> = {
  1: { color: '#facc15', bg: 'rgba(250,204,21,0.06)', border: 'rgba(250,204,21,0.35)', label: '1ST' },
  2: { color: '#e4e4e7', bg: 'rgba(228,228,231,0.04)', border: 'rgba(228,228,231,0.25)', label: '2ND' },
  3: { color: '#d97706', bg: 'rgba(217,119,6,0.05)', border: 'rgba(217,119,6,0.30)', label: '3RD' },
};

const headerSx = {
  color: '#a1a1aa',
  fontWeight: 600,
  fontSize: '0.85rem',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  borderBottom: '1px solid #27272a',
  py: 2,
  px: 3,
  whiteSpace: 'nowrap' as const,
};

const cellSx = {
  borderBottom: '1px solid rgba(39,39,42,0.6)',
  py: 2.5,
  px: 3,
};

export const ResultPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: cohortIdParam } = useParams<{ id: string }>();

  const { data: userData } = useUser();

  const {
    data: cohortData,
    isLoading: cohortLoading,
    error: cohortError,
  } = useCohort(cohortIdParam);

  const {
    data: leaderboardData,
    isLoading: leaderboardLoading,
    error: leaderboardError,
  } = useCohortLeaderboard(
    { cohortId: cohortIdParam || '' },
    {
      enabled: !!cohortIdParam,
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
      staleTime: 0,
    },
  );

  const canViewAttendance = useMemo(
    () => userData?.role === UserRole.ADMIN || userData?.role === UserRole.TEACHING_ASSISTANT,
    [userData?.role],
  );

  const hasExercises = useMemo(() => cohortHasExercises(cohortData?.type || ''), [cohortData?.type]);

  const results = useMemo<StudentResult[]>(() => transformLeaderboardData(leaderboardData), [leaderboardData]);

  const sortedResults = useMemo(() => sortResults(results), [results]);

  const cohortName = useMemo(() => formatCohortName(cohortData), [cohortData]);


  const handleStudentClick = useCallback(
    (student: StudentResult) => {
      if (!cohortData) return;
      navigate(
        `/detailPage?studentId=${student.userId}` +
          `&cohortType=${cohortData.type}` +
          `&cohortId=${cohortData.id}` +
          `&studentName=${encodeURIComponent(student.name)}` +
          `&studentDiscord=${encodeURIComponent(student.discordUsername)}` +
          `&from=results`,
      );
    },
    [navigate, cohortData],
  );

  const loading = cohortLoading || leaderboardLoading;
  const error = getErrorMessage(cohortError) || getErrorMessage(leaderboardError);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: '#f97316' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ color: '#f87171' }}>Failed to load leaderboard: {error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#000', px: { xs: 2, md: 4 }, py: { xs: 2, md: 4 } }}>
      <Box sx={{ maxWidth: 960, mx: 'auto' }}>
        {/* Back button */}
        <Button
          startIcon={<ArrowLeft size={18} />}
          onClick={() => navigate(-1)}
          sx={{
            color: '#a1a1aa',
            textTransform: 'none',
            fontWeight: 500,
            mb: 3,
            px: 1.5,
            '&:hover': { color: '#fafafa', bgcolor: 'rgba(255,255,255,0.05)' },
          }}
        >
          Back
        </Button>

        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 1.5 }}>
            <Flame size={32} color="#f97316" />
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                color: '#fff',
                fontSize: { xs: '2rem', md: '2.75rem' },
                letterSpacing: '-0.02em',
                textShadow: '0 0 40px rgba(249,115,22,0.3)',
              }}
            >
              Leaderboard
            </Typography>
            <Flame size={32} color="#f97316" />
          </Box>
          <Typography variant="body1" sx={{ color: '#a1a1aa', fontSize: '1.1rem' }}>
            {cohortName || 'Cohort information unavailable'}
          </Typography>
        </Box>

        {/* Rankings table */}
        {sortedResults.length > 0 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...headerSx, width: 80 }}>Rank</TableCell>
                  <TableCell sx={headerSx}>Discord</TableCell>
                  {canViewAttendance && (
                    <TableCell sx={{ ...headerSx, display: { xs: 'none', sm: 'table-cell' } }}>Attendance</TableCell>
                  )}
                  <TableCell sx={headerSx}>Score</TableCell>
                  {hasExercises && (
                    <TableCell sx={{ ...headerSx, display: { xs: 'none', sm: 'table-cell' } }}>Exercises</TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedResults.map((student, index) => {
                  const rank = index + 1;
                  const highlight = RANK_HIGHLIGHT[rank];

                  return (
                    <TableRow
                      key={student.userId}
                      hover
                      onClick={() => handleStudentClick(student)}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: highlight?.bg ?? 'transparent',
                        borderLeft: highlight ? `3px solid ${highlight.border}` : '3px solid transparent',
                        '&:hover': { bgcolor: highlight ? highlight.bg : 'rgba(255,255,255,0.03)' },
                        transition: 'background-color 150ms',
                      }}
                    >
                      <TableCell sx={cellSx}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {rank === 1 && <Crown size={18} color={highlight!.color} />}
                          {(rank === 2 || rank === 3) && <Medal size={18} color={highlight!.color} />}
                          <Typography sx={{
                            fontWeight: highlight ? 800 : 600,
                            color: highlight?.color ?? '#a1a1aa',
                            fontSize: '1rem',
                          }}>
                            {highlight ? highlight.label : `#${rank}`}
                          </Typography>
                        </Box>
                      </TableCell>

                      <TableCell sx={cellSx}>
                        <Typography sx={{
                          color: '#fafafa',
                          fontWeight: highlight ? 700 : 500,
                          fontSize: '1rem',
                        }}>
                          {student.discordUsername}
                        </Typography>
                      </TableCell>

                      {canViewAttendance && (
                        <TableCell sx={{ ...cellSx, display: { xs: 'none', sm: 'table-cell' } }}>
                          <Typography sx={{ color: '#d4d4d8', fontSize: '1rem' }}>
                            {student.totalAttendance}/{student.maxAttendance}
                          </Typography>
                        </TableCell>
                      )}

                      <TableCell sx={cellSx}>
                        <Typography sx={{
                          fontWeight: 700,
                          color: highlight?.color ?? getScoreColor(student.totalScore),
                          fontSize: '1.05rem',
                        }}>
                          {student.totalScore}
                        </Typography>
                      </TableCell>

                      {hasExercises && (
                        <TableCell sx={{ ...cellSx, display: { xs: 'none', sm: 'table-cell' } }}>
                          <Chip
                            label={student.exercisesCompleted}
                            size="small"
                            sx={{
                              bgcolor: student.exercisesCompleted > 0 ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
                              color: student.exercisesCompleted > 0 ? '#4ade80' : '#71717a',
                              fontWeight: 600,
                              fontSize: '0.9rem',
                              height: 26,
                            }}
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Footer */}
        <Typography sx={{ textAlign: 'center', color: '#71717a', mt: 4, fontSize: '0.95rem' }}>
          Showing {sortedResults.length} students
        </Typography>

        {/* Empty state */}
        {sortedResults.length === 0 && (
          <Typography sx={{ textAlign: 'center', color: '#71717a', mt: 6 }}>
            No students found for this cohort.
          </Typography>
        )}
      </Box>
    </Box>
  );
};
