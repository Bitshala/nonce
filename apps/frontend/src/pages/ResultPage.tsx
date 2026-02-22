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
import { ArrowLeft, Trophy, Medal, Crown, Flame } from 'lucide-react';

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

const RANK_CONFIG = {
  1: {
    color: '#facc15',
    glow: 'rgba(250,204,21,0.3)',
    glowStrong: 'rgba(250,204,21,0.15)',
    bg: 'rgba(250,204,21,0.06)',
    border: 'rgba(250,204,21,0.25)',
    label: '1ST',
    fontSize: { xs: '1.6rem', sm: '2rem' },
    rankFontSize: { xs: '1.3rem', sm: '1.6rem' },
    iconSize: 28,
    py: { xs: 3, sm: 4 },
  },
  2: {
    color: '#e4e4e7',
    glow: 'rgba(228,228,231,0.2)',
    glowStrong: 'rgba(228,228,231,0.1)',
    bg: 'rgba(228,228,231,0.04)',
    border: 'rgba(228,228,231,0.2)',
    label: '2ND',
    fontSize: { xs: '1.3rem', sm: '1.6rem' },
    rankFontSize: { xs: '1.1rem', sm: '1.3rem' },
    iconSize: 24,
    py: { xs: 2.5, sm: 3 },
  },
  3: {
    color: '#d97706',
    glow: 'rgba(217,119,6,0.25)',
    glowStrong: 'rgba(217,119,6,0.12)',
    bg: 'rgba(217,119,6,0.05)',
    border: 'rgba(217,119,6,0.25)',
    label: '3RD',
    fontSize: { xs: '1.1rem', sm: '1.3rem' },
    rankFontSize: { xs: '1rem', sm: '1.1rem' },
    iconSize: 22,
    py: { xs: 2, sm: 2.5 },
  },
} as const;

const headerSx = {
  color: '#a1a1aa',
  fontWeight: 600,
  fontSize: '0.75rem',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  borderBottom: '1px solid #27272a',
  py: 1.5,
  px: 2.5,
  whiteSpace: 'nowrap' as const,
};

const cellSx = {
  borderBottom: '1px solid rgba(39,39,42,0.6)',
  py: 2,
  px: 2.5,
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

  const topThree = useMemo(() => sortedResults.slice(0, 3), [sortedResults]);
  const restResults = useMemo(() => sortedResults.slice(3), [sortedResults]);

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
          <Typography variant="body1" sx={{ color: '#a1a1aa', fontSize: '1rem' }}>
            {cohortName || 'Cohort information unavailable'}
          </Typography>
        </Box>

        {/* Podium - Top 3 */}
        {topThree.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 5 }}>
            {topThree.map((student, index) => {
              const rank = (index + 1) as 1 | 2 | 3;
              const config = RANK_CONFIG[rank];

              return (
                <Box
                  key={student.userId}
                  onClick={() => handleStudentClick(student)}
                  sx={{
                    cursor: 'pointer',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: { xs: 2, sm: 3 },
                    py: config.py,
                    px: { xs: 2.5, sm: 4 },
                    borderRadius: 3,
                    bgcolor: config.bg,
                    border: `1px solid ${config.border}`,
                    boxShadow: `0 0 20px ${config.glow}, inset 0 0 20px ${config.glowStrong}`,
                    transition: 'all 200ms ease',
                    overflow: 'hidden',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: `0 0 35px ${config.glow}, inset 0 0 25px ${config.glowStrong}`,
                      bgcolor: `${config.bg}`.replace(')', ', 0.1)').replace('rgba', 'rgba'),
                    },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '1px',
                      background: `linear-gradient(90deg, transparent, ${config.color}, transparent)`,
                      opacity: 0.4,
                    },
                  }}
                >
                  {/* Rank badge */}
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      minWidth: { xs: 48, sm: 64 },
                    }}
                  >
                    {rank === 1 ? (
                      <Crown size={config.iconSize} color={config.color} />
                    ) : (
                      <Medal size={config.iconSize} color={config.color} />
                    )}
                    <Typography
                      sx={{
                        fontWeight: 900,
                        color: config.color,
                        fontSize: config.rankFontSize,
                        letterSpacing: '0.05em',
                        lineHeight: 1.2,
                        mt: 0.5,
                      }}
                    >
                      {config.label}
                    </Typography>
                  </Box>

                  {/* Name & details */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontWeight: 800,
                        color: '#fff',
                        fontSize: config.fontSize,
                        letterSpacing: '-0.01em',
                        lineHeight: 1.2,
                        textShadow: `0 0 20px ${config.glow}`,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {student.discordUsername}
                    </Typography>
                    {canViewAttendance && (
                      <Typography variant="body2" sx={{ color: '#a1a1aa', mt: 0.5 }}>
                        Attendance: {student.totalAttendance}/{student.maxAttendance}
                      </Typography>
                    )}
                  </Box>

                  {/* Score */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 3 }, flexShrink: 0 }}>
                    {hasExercises && (
                      <Box sx={{ display: { xs: 'none', sm: 'flex' }, flexDirection: 'column', alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ color: '#a1a1aa', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                          Exercises
                        </Typography>
                        <Chip
                          label={student.exercisesCompleted}
                          size="small"
                          sx={{
                            bgcolor: student.exercisesCompleted > 0 ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
                            color: student.exercisesCompleted > 0 ? '#4ade80' : '#71717a',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            height: 28,
                            mt: 0.5,
                          }}
                        />
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#a1a1aa', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                        Score
                      </Typography>
                      <Typography
                        sx={{
                          fontWeight: 900,
                          color: config.color,
                          fontSize: { xs: '1.3rem', sm: '1.6rem' },
                          lineHeight: 1.2,
                          textShadow: `0 0 15px ${config.glow}`,
                        }}
                      >
                        {student.totalScore}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}

        {/* Rest of results table */}
        {restResults.length > 0 && (
          <>
            <Typography
              sx={{
                color: '#71717a',
                fontWeight: 600,
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                mb: 1.5,
                px: 1,
              }}
            >
              Other Rankings
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ ...headerSx, width: 64 }}>Rank</TableCell>
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
                  {restResults.map((student, index) => {
                    const rank = index + 4;

                    return (
                      <TableRow
                        key={student.userId}
                        hover
                        onClick={() => handleStudentClick(student)}
                        sx={{
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
                          transition: 'background-color 150ms',
                        }}
                      >
                        <TableCell sx={cellSx}>
                          <Typography sx={{ fontWeight: 600, color: '#a1a1aa', fontSize: '0.9rem' }}>
                            #{rank}
                          </Typography>
                        </TableCell>

                        <TableCell sx={cellSx}>
                          <Typography sx={{ color: '#fafafa', fontWeight: 500, fontSize: '0.9rem' }}>
                            {student.discordUsername}
                          </Typography>
                        </TableCell>

                        {canViewAttendance && (
                          <TableCell sx={{ ...cellSx, display: { xs: 'none', sm: 'table-cell' } }}>
                            <Typography variant="body2" sx={{ color: '#d4d4d8' }}>
                              {student.totalAttendance}/{student.maxAttendance}
                            </Typography>
                          </TableCell>
                        )}

                        <TableCell sx={cellSx}>
                          <Typography sx={{ fontWeight: 700, color: getScoreColor(student.totalScore), fontSize: '0.9rem' }}>
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
                                fontSize: '0.8rem',
                                height: 24,
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
          </>
        )}

        {/* Footer */}
        <Typography variant="body2" sx={{ textAlign: 'center', color: '#71717a', mt: 4 }}>
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
