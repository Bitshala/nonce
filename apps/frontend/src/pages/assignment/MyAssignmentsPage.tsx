import { useEffect, useMemo, useState } from 'react';
import { alpha } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import {
  type AssignmentSummaryResponse,
  ProvisionStatus,
  submissionBucket,
} from '@nonce/shared';
import { AssignmentTheme } from '../../components/assignment/AssignmentTheme.tsx';
import {
  BUCKET_META,
  type ChipColor,
} from '../../components/assignment/chips.ts';
import {
  isProvisioning,
  provisionRefetchInterval,
} from '../../components/assignment/provision.ts';
import { fontFamilyMono } from '../../components/fellowship/theme.ts';
import { formatDate, formatDateTime } from '../../utils/dateUtils.ts';
import { readStored, writeStored } from '../../utils/storage.ts';
import { cohortTypeToName } from '../../helpers/cohortHelpers.ts';
import {
  useAcceptAssignment,
  useAssignment,
  useMyAssignments,
} from '../../hooks/assignmentHooks.ts';
import { extractErrorMessage } from '../../utils/errorUtils.ts';
import { usePageMeta } from '../../hooks/usePageMeta.ts';

type RowState =
  'available' | 'closed' | 'setup' | 'failed' | 'progress' | 'needs' | 'passed';

const rowStateOf = (assignment: AssignmentSummaryResponse): RowState => {
  const submission = assignment.submission;
  if (!submission) {
    return assignment.isOpenForSubmission ? 'available' : 'closed';
  }
  switch (submissionBucket(submission)) {
    case 'passed':
      return 'passed';
    case 'setupFailed':
      return 'failed';
    case 'failing':
      return 'needs';
    case 'inProgress':
      return isProvisioning(submission.provisionStatus) ? 'setup' : 'progress';
  }
};

const BADGE: Record<RowState, { label: string; color: ChipColor }> = {
  available: { label: 'Available', color: 'success' },
  closed: { label: 'Closed', color: 'default' },
  setup: { label: 'Setting up', color: 'info' },
  failed: BUCKET_META.setupFailed,
  progress: BUCKET_META.inProgress,
  needs: { label: 'Needs work', color: 'warning' },
  passed: BUCKET_META.passed,
};

const VERB: Record<RowState, string | null> = {
  available: 'Start',
  closed: null,
  setup: 'Opening…',
  failed: null,
  progress: 'Resume',
  needs: 'Fix',
  passed: 'Review',
};

/** True once a submission is ready to work in — clicking jumps straight to the editor. */
const isReadyToOpen = (assignment: AssignmentSummaryResponse) =>
  assignment.submission?.provisionStatus === ProvisionStatus.READY;

interface SeasonGroup {
  season: number;
  cohortId: string;
  assignments: AssignmentSummaryResponse[];
}
interface CourseGroup {
  cohortType: string;
  label: string;
  seasons: SeasonGroup[];
}

const groupByCourse = (
  assignments: AssignmentSummaryResponse[]
): CourseGroup[] => {
  const courses = new Map<string, CourseGroup>();
  for (const assignment of assignments) {
    let course = courses.get(assignment.cohortType);
    if (!course) {
      course = {
        cohortType: assignment.cohortType,
        label: cohortTypeToName(assignment.cohortType),
        seasons: [],
      };
      courses.set(assignment.cohortType, course);
    }
    let season = course.seasons.find(s => s.cohortId === assignment.cohortId);
    if (!season) {
      season = {
        season: assignment.cohortSeason,
        cohortId: assignment.cohortId,
        assignments: [],
      };
      course.seasons.push(season);
    }
    season.assignments.push(assignment);
  }
  for (const course of courses.values()) {
    course.seasons.sort((a, b) => b.season - a.season);
    for (const season of course.seasons) {
      season.assignments.sort((a, b) => a.weekNumber - b.weekNumber);
    }
  }
  return [...courses.values()].sort((a, b) => a.label.localeCompare(b.label));
};

/** The single most useful thing to do next in a course: something in progress, else the next available week. */
const findUpNext = (
  season: SeasonGroup | null
): AssignmentSummaryResponse | null => {
  const all = season?.assignments ?? [];
  const inProgress = all.find(a => rowStateOf(a) === 'progress');
  if (inProgress) return inProgress;
  const available = all.find(a => rowStateOf(a) === 'available');
  return available ?? null;
};

const Themed = ({ children }: { children: React.ReactNode }) => (
  <AssignmentTheme>
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        color: 'text.primary',
        p: { xs: 2, md: 5 },
      }}
    >
      {children}
    </Box>
  </AssignmentTheme>
);

export const MyAssignmentsPage = () => {
  const navigate = useNavigate();
  const { data: assignments, isLoading, isError, error } = useMyAssignments();
  const [selectedCourse, setSelectedCourse] = useState<string | null>(() =>
    readStored('assignments-course')
  );
  const [selectedSeason, setSelectedSeason] = useState<Record<string, number>>(
    {}
  );
  const [openId, setOpenId] = useState<string | null>(null);

  usePageMeta('Assignments');

  const courses = useMemo(
    () => groupByCourse(assignments ?? []),
    [assignments]
  );

  useEffect(() => {
    if (courses.length === 0) return;
    if (
      !selectedCourse ||
      !courses.some(c => c.cohortType === selectedCourse)
    ) {
      setSelectedCourse(courses[0].cohortType);
    }
  }, [courses, selectedCourse]);

  const activeCourse =
    courses.find(c => c.cohortType === selectedCourse) ?? courses[0] ?? null;
  const activeSeasonNumber =
    (activeCourse && selectedSeason[activeCourse.cohortType]) ??
    activeCourse?.seasons[0]?.season ??
    null;
  const activeSeason =
    activeCourse?.seasons.find(s => s.season === activeSeasonNumber) ??
    activeCourse?.seasons[0] ??
    null;
  const upNext = findUpNext(activeSeason);
  const doneCount =
    activeSeason?.assignments.filter(a => rowStateOf(a) === 'passed').length ??
    0;

  const selectCourse = (cohortType: string) => {
    setSelectedCourse(cohortType);
    writeStored('assignments-course', cohortType);
  };

  const handleRowOpen = (assignment: AssignmentSummaryResponse) => {
    if (isReadyToOpen(assignment)) {
      navigate(`/assignments/${assignment.id}/editor`);
    } else {
      setOpenId(assignment.id);
    }
  };

  if (isLoading) {
    return (
      <Themed>
        <CircularProgress aria-label="Loading assignments" />
      </Themed>
    );
  }

  if (isError) {
    return (
      <Themed>
        <Alert severity="error">{extractErrorMessage(error)}</Alert>
      </Themed>
    );
  }

  const total = Math.max(activeSeason?.assignments.length ?? 0, 1);

  return (
    <AssignmentTheme>
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          color: 'text.primary',
          p: { xs: 2, md: 5 },
        }}
      >
        <Typography variant="overline" color="text.secondary">
          Your courses
        </Typography>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          Assignments
        </Typography>

        {courses.length > 0 && (
          <Tabs
            value={activeCourse?.cohortType ?? false}
            onChange={(_, v: string) => selectCourse(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider', mt: 1, mb: 3 }}
          >
            {courses.map(c => (
              <Tab
                key={c.cohortType}
                value={c.cohortType}
                label={c.label}
                sx={{ textTransform: 'none', fontSize: 15 }}
              />
            ))}
          </Tabs>
        )}

        {courses.length === 0 && (
          <Typography color="text.secondary">No assignments yet.</Typography>
        )}

        {activeCourse && (
          <>
            {upNext && (
              <Paper
                variant="outlined"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2.5,
                  mb: 3,
                  bgcolor: theme => alpha(theme.palette.primary.main, 0.08),
                  borderColor: 'primary.main',
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="overline" color="primary">
                    Up next · Week {upNext.weekNumber}
                  </Typography>
                  <Typography sx={{ fontWeight: 600 }}>
                    {upNext.title ?? `Week ${upNext.weekNumber} exercise`}
                  </Typography>
                  {upNext.deadline && (
                    <Typography variant="body2" color="text.secondary">
                      Due {formatDate(upNext.deadline)}
                    </Typography>
                  )}
                </Box>
                <Button
                  variant="contained"
                  onClick={() => handleRowOpen(upNext)}
                >
                  {VERB[rowStateOf(upNext)]}
                </Button>
              </Paper>
            )}

            {activeCourse.seasons.length > 0 && (
              <Stack
                direction="row"
                sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2 }}
              >
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={activeSeason?.season ?? null}
                  onChange={(_, v: number | null) =>
                    v !== null &&
                    setSelectedSeason(prev => ({
                      ...prev,
                      [activeCourse.cohortType]: v,
                    }))
                  }
                  aria-label="Season"
                >
                  {activeCourse.seasons.map(season => (
                    <ToggleButton
                      key={season.cohortId}
                      value={season.season}
                      sx={{ textTransform: 'none', px: 2 }}
                    >
                      Season {season.season}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
                {activeSeason && (
                  <Stack
                    direction="row"
                    spacing={1.5}
                    sx={{
                      alignItems: 'center',
                      flex: 1,
                      minWidth: 160,
                      maxWidth: 260,
                    }}
                  >
                    <LinearProgress
                      variant="determinate"
                      value={(doneCount / total) * 100}
                      sx={{ flex: 1, height: 6, borderRadius: 3 }}
                    />
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontFamily: fontFamilyMono }}
                    >
                      {doneCount} / {activeSeason.assignments.length}
                    </Typography>
                  </Stack>
                )}
              </Stack>
            )}

            <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
              <Table>
                <TableBody>
                  {activeSeason?.assignments.map(assignment => {
                    const state = rowStateOf(assignment);
                    const badge = BADGE[state];
                    const verb = VERB[state];
                    const isClosed = state === 'closed';
                    return (
                      <TableRow
                        key={assignment.id}
                        hover={!isClosed}
                        selected={openId === assignment.id}
                        onClick={() =>
                          isClosed ? undefined : handleRowOpen(assignment)
                        }
                        {...(isClosed
                          ? {}
                          : {
                              tabIndex: 0,
                              role: 'link',
                              onKeyDown: (e: React.KeyboardEvent) => {
                                if (e.target !== e.currentTarget) return;
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleRowOpen(assignment);
                                }
                              },
                            })}
                        sx={{
                          cursor: isClosed ? 'default' : 'pointer',
                          opacity: isClosed ? 0.6 : 1,
                        }}
                      >
                        <TableCell sx={{ width: 72 }}>
                          <Chip
                            size="small"
                            label={`W${assignment.weekNumber}`}
                            color={
                              state === 'passed'
                                ? 'success'
                                : upNext?.id === assignment.id
                                  ? 'primary'
                                  : 'default'
                            }
                            sx={{ fontFamily: fontFamilyMono }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontWeight: 600 }}>
                            {assignment.title ??
                              `Week ${assignment.weekNumber} exercise`}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {isClosed
                              ? 'Closed for submission'
                              : assignment.deadline
                                ? `Due ${formatDate(assignment.deadline)}`
                                : `Week ${assignment.weekNumber}`}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {state !== 'available' && (
                            <Chip
                              size="small"
                              label={badge.label}
                              color={badge.color}
                              variant="outlined"
                            />
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {verb && (
                            <Button
                              size="small"
                              variant={
                                state === 'available' || state === 'progress'
                                  ? 'contained'
                                  : 'outlined'
                              }
                              disabled={state === 'setup'}
                              onClick={e => {
                                e.stopPropagation();
                                handleRowOpen(assignment);
                              }}
                            >
                              {verb}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Paper>
          </>
        )}
      </Box>

      {openId && (
        <AssignmentBrief
          assignmentId={openId}
          onClose={() => setOpenId(null)}
        />
      )}
    </AssignmentTheme>
  );
};

const AssignmentBrief = ({
  assignmentId,
  onClose,
}: {
  assignmentId: string;
  onClose: () => void;
}) => {
  const navigate = useNavigate();
  const { data: assignment, isLoading } = useAssignment(assignmentId, {
    refetchInterval: provisionRefetchInterval,
  });
  const acceptAssignment = useAcceptAssignment();

  const submission = assignment?.submission ?? null;
  const isReady = submission?.provisionStatus === ProvisionStatus.READY;
  const isSettingUp = isProvisioning(submission?.provisionStatus);

  useEffect(() => {
    if (isReady)
      navigate(`/assignments/${assignmentId}/editor`, { replace: true });
  }, [isReady, assignmentId, navigate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <Drawer
      anchor="right"
      open
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: '100vw', sm: 460 } } } }}
    >
      <Stack spacing={2.5} sx={{ p: 3.5, minHeight: '100%' }}>
        <IconButton
          onClick={onClose}
          aria-label="Close"
          size="small"
          sx={{ alignSelf: 'flex-end' }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        {isLoading || !assignment ? (
          <CircularProgress size={24} aria-label="Loading assignment" />
        ) : (
          <>
            <Box>
              <Typography variant="overline" color="text.secondary">
                Week {assignment.weekNumber} · Season {assignment.cohortSeason}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {assignment.title ?? `Week ${assignment.weekNumber} exercise`}
              </Typography>
            </Box>

            {assignment.deadline && (
              <Chip
                size="small"
                color="success"
                variant="outlined"
                label={`Due ${formatDateTime(assignment.deadline)}`}
                sx={{ alignSelf: 'flex-start' }}
              />
            )}

            {assignment.exercise?.problem && (
              <Typography color="text.secondary">
                {assignment.exercise.problem}
              </Typography>
            )}

            {assignment.exercise &&
              assignment.exercise.expectedOutput.length > 0 && (
                <Box>
                  <Typography variant="overline" color="text.secondary">
                    You're done when
                  </Typography>
                  <List dense disablePadding>
                    {assignment.exercise.expectedOutput.map((line, i) => (
                      <ListItem key={i} disableGutters>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <RadioButtonUncheckedIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={line} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

            <Stack
              spacing={1}
              sx={{
                mt: 'auto !important',
                pt: 2,
                borderTop: 1,
                borderColor: 'divider',
              }}
            >
              {!submission && (
                <>
                  <Button
                    variant="contained"
                    size="large"
                    disabled={
                      acceptAssignment.isPending ||
                      !assignment.isOpenForSubmission
                    }
                    onClick={() => acceptAssignment.mutate(assignment.id)}
                  >
                    {acceptAssignment.isPending
                      ? 'Starting…'
                      : 'Start assignment'}
                  </Button>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ textAlign: 'center' }}
                  >
                    Starting creates your private workspace. Nothing to install.
                  </Typography>
                  {acceptAssignment.isError && (
                    <Alert severity="error">
                      {extractErrorMessage(acceptAssignment.error)}
                    </Alert>
                  )}
                </>
              )}

              {isSettingUp && (
                <>
                  <Typography sx={{ fontWeight: 600 }}>Setting up</Typography>
                  <LinearProgress />
                  <Typography variant="caption" color="text.secondary">
                    Opens automatically — you can close this and keep browsing.
                  </Typography>
                </>
              )}

              {submission?.provisionStatus === ProvisionStatus.FAILED && (
                <Alert severity="error">
                  We could not create your workspace. Please contact an admin
                  and mention this assignment.
                  {submission.provisionError && (
                    <Box
                      component="pre"
                      sx={{
                        fontFamily: fontFamilyMono,
                        fontSize: 12,
                        whiteSpace: 'pre-wrap',
                        m: 0,
                        mt: 1,
                      }}
                    >
                      {submission.provisionError}
                    </Box>
                  )}
                </Alert>
              )}
            </Stack>
          </>
        )}
      </Stack>
    </Drawer>
  );
};

export default MyAssignmentsPage;
