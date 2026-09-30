import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Avatar,
  Chip,
  Collapse,
  IconButton,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Drawer,
  Paper,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Stack,
  Tab,
  Tabs,
  ThemeProvider,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  type AdminAssignmentResponse,
  type AdminSubmissionResponse,
  AssignmentStatus,
  ProvisionStatus,
  UserRole,
} from '@nonce/shared';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SearchIcon from '@mui/icons-material/Search';
import { fellowshipDarkTheme } from '../../components/fellowship/theme.ts';
import { cohortTypeToName } from '../../helpers/cohortHelpers.ts';
import {
  useAdminAssignments,
  useAdminSubmissions,
  useArchiveCohortRepos,
  useOverrideSubmissionScore,
  useRegradeAssignment,
  useReprovisionSubmission,
  useSyncCohortAssignments,
} from '../../hooks/assignmentHooks.ts';
import { useAuth } from '../../hooks/useAuth.ts';
import { useUser } from '../../hooks/userHooks.ts';
import { extractErrorMessage } from '../../utils/errorUtils.ts';
import { usePageMeta } from '../../hooks/usePageMeta.ts';
import { Legend, StackedBar, sumTallies } from './AssignmentBars.tsx';

type ChipColor = 'default' | 'success' | 'error' | 'info' | 'warning';

const STATUS_CHIP: Record<AssignmentStatus, { label: string; color: ChipColor }> = {
  [AssignmentStatus.DRAFT]: { label: 'Draft', color: 'default' },
  [AssignmentStatus.PUBLISHED]: { label: 'Published', color: 'success' },
  [AssignmentStatus.CLOSED]: { label: 'Closed', color: 'warning' },
};

const PROVISION_CHIP: Record<ProvisionStatus, { label: string; color: ChipColor }> = {
  [ProvisionStatus.PENDING]: { label: 'Pending', color: 'info' },
  [ProvisionStatus.PROVISIONING]: { label: 'Setting up', color: 'info' },
  [ProvisionStatus.READY]: { label: 'Ready', color: 'success' },
  [ProvisionStatus.FAILED]: { label: 'Setup failed', color: 'error' },
};

interface CohortGroup {
  cohortId: string;
  cohortType: string;
  season: number;
  assignments: AdminAssignmentResponse[];
}

const groupByCohort = (assignments: AdminAssignmentResponse[]): CohortGroup[] => {
  const groups = new Map<string, CohortGroup>();
  for (const a of assignments) {
    let group = groups.get(a.cohortId);
    if (!group) {
      group = { cohortId: a.cohortId, cohortType: a.cohortType, season: a.cohortSeason, assignments: [] };
      groups.set(a.cohortId, group);
    }
    group.assignments.push(a);
  }
  for (const g of groups.values()) g.assignments.sort((a, b) => a.weekNumber - b.weekNumber);
  return [...groups.values()];
};

interface Confirm {
  title: string;
  body: string;
  action: string;
  onConfirm: () => void;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const DAY_MS = 86_400_000;
/** The page is laid out by its own width, not the viewport's: the app sidebar eats ~280px when open. */
const WIDE = '@container (min-width: 1200px)';
const mono = { fontFamily: 'monospace' } as const;

const StatCard = ({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color?: string;
}) => (
  <Paper variant="outlined" sx={{ p: 2.5 }}>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="h4" sx={{ fontWeight: 700, my: 0.5, color }}>
      {value}
    </Typography>
    <Typography variant="body2" color="text.secondary">
      {sub}
    </Typography>
  </Paper>
);

const AttentionItem = ({
  dot,
  text,
  sub,
  action,
  onAction,
  hideWide,
}: {
  dot: string;
  text: string;
  sub?: string;
  action?: string;
  onAction: () => void;
  /** Config warnings live inside the Course config card when there is room for it. */
  hideWide?: boolean;
}) => (
  <Stack
    direction="row"
    spacing={1.5}
    sx={{
      alignItems: 'center',
      bgcolor: 'action.hover',
      borderRadius: 1,
      px: 1.5,
      py: 1.25,
      ...(hideWide && { [WIDE]: { display: 'none' } }),
    }}
  >
    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: dot, flexShrink: 0 }} />
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {text}
      </Typography>
      {sub && (
        <Typography variant="caption" color="text.secondary">
          {sub}
        </Typography>
      )}
    </Box>
    {action && (
      <Button size="small" variant="outlined" sx={{ flexShrink: 0 }} onClick={onAction}>
        {action}
      </Button>
    )}
  </Stack>
);

export const AdminAssignmentsPage = () => {
  const { isAuthenticated } = useAuth();
  const { data: user } = useUser(undefined, { enabled: isAuthenticated });
  const isAdmin = user?.role === UserRole.ADMIN;

  const { data: assignments, isLoading, isError, error } = useAdminAssignments();
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedCohort, setSelectedCohort] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [showAttention, setShowAttention] = useState(true);

  const sync = useSyncCohortAssignments();
  const archive = useArchiveCohortRepos();

  usePageMeta('Assignments · Admin');

  const groups = useMemo(() => groupByCohort(assignments ?? []), [assignments]);
  const courses = useMemo(
    () =>
      [...new Set(groups.map(g => g.cohortType))]
        .map(type => ({ type, label: cohortTypeToName(type) }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [groups]
  );
  const activeCourse = courses.find(c => c.type === selectedCourse) ?? courses[0] ?? null;
  const seasons = groups.filter(g => g.cohortType === activeCourse?.type).sort((a, b) => b.season - a.season);
  const group = seasons.find(g => g.cohortId === selectedCohort) ?? seasons[0] ?? null;

  const runSync = (g: CohortGroup) =>
    sync.mutate(g.cohortId, {
      onSuccess: r => setNotice(`Season ${g.season}: ${r.created} created, ${r.updated} updated.`),
      onError: e => setNotice(extractErrorMessage(e)),
    });

  const askArchive = (g: CohortGroup) =>
    setConfirm({
      title: `Archive season ${g.season}?`,
      body: 'Every assignment repository in this season becomes read-only. Students keep their work through the zip export.',
      action: 'Archive',
      onConfirm: () =>
        archive.mutate(g.cohortId, {
          onSuccess: () => setNotice(`Season ${g.season}: archival queued.`),
          onError: e => setNotice(extractErrorMessage(e)),
        }),
    });

  // --- Derived numbers for the selected season ---------------------------
  const rows = (group?.assignments ?? []).filter(a => {
    const q = query.trim().toLowerCase();
    return !q || `w${a.weekNumber} ${a.title ?? ''}`.toLowerCase().includes(q);
  });
  // Drafts are not open to students, so they say nothing about progress.
  const live = (group?.assignments ?? []).filter(a => a.status !== AssignmentStatus.DRAFT);
  const total = sumTallies(live);
  const enrolled = group?.assignments[0]?.enrolledCount ?? 0;
  const slots = live.reduce((n, a) => n + a.enrolledCount, 0);
  const started = live.reduce((n, a) => n + a.submissionCount, 0);
  const graded = total.passedCount + total.failingCount;

  const now = Date.now();
  const upcoming = live
    .filter(a => a.status === AssignmentStatus.PUBLISHED && a.deadline && new Date(a.deadline).getTime() > now)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());
  const nextDue = upcoming[0];
  const lastDue = live.filter(a => a.deadline).sort((a, b) => b.deadline!.localeCompare(a.deadline!))[0];

  // Each flag names the assignment and what to do; all of them open Manage.
  const flags = live.flatMap(a => [
    ...(a.failedProvisionCount > 0
      ? [{ id: `${a.id}-setup`, a, text: `${a.failedProvisionCount} repo setup ${a.failedProvisionCount === 1 ? 'failure' : 'failures'}`, fix: 'Retry setup' }]
      : []),
    ...(a.failingCount > 0
      ? [{ id: `${a.id}-fail`, a, text: `${a.failingCount} ${a.failingCount === 1 ? 'student is' : 'students are'} failing checks`, fix: 'Review' }]
      : []),
    ...(a.isPastDeadline && a.notStartedCount > 0
      ? [{ id: `${a.id}-late`, a, text: `${a.notStartedCount} never started; past due`, fix: 'Review' }]
      : []),
  ]);

  const checks: string[] = [];
  const dueDates = new Set(live.map(a => a.deadline));
  if (live.length > 1 && dueDates.size === 1 && lastDue?.deadline) {
    checks.push(
      `All ${live.length} assignments share one due date (${new Date(lastDue.deadline).toLocaleString()}). Weekly dates expected?`
    );
  }
  if (total.notStartedCount > 0 && live.some(a => a.isPastDeadline)) {
    checks.push(
      `Due date passed with ${total.notStartedCount} submissions not started. Are students enrolled and repos created?`
    );
  }

  return (
    <ThemeProvider theme={fellowshipDarkTheme}>
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary', p: { xs: 2, md: 5 } }}>
        {isLoading && <CircularProgress aria-label="Loading assignments" />}
        {isError && <Alert severity="error">{extractErrorMessage(error)}</Alert>}

        {assignments && (
          <>
            <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="overline" color="text.secondary">
                  Admin
                </Typography>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                  Assignments
                </Typography>
              </Box>
              <TextField
                size="small"
                placeholder="Find an assignment"
                value={query}
                onChange={e => setQuery(e.target.value)}
                sx={{ minWidth: 280 }}
                slotProps={{
                  htmlInput: { 'aria-label': 'Find an assignment' },
                  input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> },
                }}
              />
            </Stack>

            {courses.length > 0 && (
              <Tabs
                value={activeCourse?.type ?? false}
                onChange={(_, v: string) => {
                  setSelectedCourse(v);
                  setSelectedCohort(null);
                }}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ borderBottom: 1, borderColor: 'divider', mt: 1, mb: 3 }}
              >
                {courses.map(c => (
                  <Tab key={c.type} value={c.type} label={c.label} sx={{ textTransform: 'none', fontSize: 15 }} />
                ))}
              </Tabs>
            )}

            {notice && (
              <Alert severity="info" onClose={() => setNotice(null)} sx={{ mb: 2 }}>
                {notice}
              </Alert>
            )}
            {groups.length === 0 && <Typography color="text.secondary">No assignments yet.</Typography>}

            {group && (
              <>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={group.cohortId}
                    onChange={(_, v: string | null) => v && setSelectedCohort(v)}
                    aria-label="Season"
                  >
                    {seasons.map(s => (
                      <ToggleButton key={s.cohortId} value={s.cohortId} sx={{ textTransform: 'none', gap: 1, px: 2 }}>
                        <b>Season {s.season}</b>
                        <Typography component="span" variant="body2" color="text.secondary" sx={mono}>
                          {s.assignments[0]?.enrolledCount ?? 0} students
                        </Typography>
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                  <Typography variant="body2" color="text.secondary">
                    {group.assignments.length} assignments · {slots} submissions
                  </Typography>
                </Stack>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
                  <StatCard
                    label="Started"
                    value={slots > 0 ? `${Math.round((started / slots) * 100)}%` : '–'}
                    sub={`${started} of ${slots} submissions`}
                  />
                  <StatCard
                    label="Passing"
                    value={graded > 0 ? `${Math.round((total.passedCount / graded) * 100)}%` : '–'}
                    sub={graded > 0 ? `${total.passedCount} of ${graded} graded runs` : 'No graded runs yet'}
                    color={graded > 0 ? 'success.main' : undefined}
                  />
                  <StatCard
                    label="Needs attention"
                    value={String(flags.length + checks.length)}
                    sub={
                      flags.length + checks.length
                        ? `${flags.length} cohort ${flags.length === 1 ? 'issue' : 'issues'} · ${checks.length} config ${checks.length === 1 ? 'issue' : 'issues'}`
                        : 'Nothing flagged'
                    }
                    color={flags.length + checks.length ? 'error.main' : undefined}
                  />
                  <StatCard
                    label="Next due"
                    value={
                      nextDue
                        ? `in ${Math.max(1, Math.ceil((new Date(nextDue.deadline!).getTime() - now) / DAY_MS))}d`
                        : 'None'
                    }
                    sub={
                      nextDue
                        ? `W${nextDue.weekNumber} · ${fmtDate(nextDue.deadline!)}`
                        : lastDue?.deadline
                          ? `All ${live.length} were due ${fmtDate(lastDue.deadline)}`
                          : 'No deadlines set'
                    }
                    color="warning.main"
                  />
                </Box>

                <Box sx={{ containerType: 'inline-size' }}>
                  <Box
                    sx={{
                      display: 'grid',
                      gap: 3,
                      alignItems: 'start',
                      gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                      gridTemplateAreas: '"attention attention" "table table" "config danger"',
                      [WIDE]: {
                        gridTemplateColumns: 'minmax(0, 1fr) 340px',
                        gridTemplateAreas: '"table attention" "table config" "table danger"',
                        gridTemplateRows: 'auto auto 1fr',
                      },
                    }}
                  >
                  <Paper variant="outlined" sx={{ overflow: 'hidden', gridArea: 'table' }}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, p: 2.5 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        Assignments
                      </Typography>
                      <Legend />
                    </Stack>
                    <Box sx={{ overflowX: 'auto' }}>
                      <Table size="medium">
                        <TableHead>
                          <TableRow>
                            <TableCell>WEEK</TableCell>
                            <TableCell>ASSIGNMENT</TableCell>
                            <TableCell>DUE</TableCell>
                            <TableCell>PROGRESS · {enrolled} STUDENTS</TableCell>
                            <TableCell />
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {rows.map(a => {
                            const status = STATUS_CHIP[a.status];
                            const gradedHere = a.passedCount + a.failingCount;
                            return (
                              <TableRow key={a.id} hover selected={openId === a.id}>
                                <TableCell>
                                  <Chip size="small" label={`W${a.weekNumber}`} sx={mono} />
                                </TableCell>
                                <TableCell sx={{ maxWidth: 260 }}>
                                  <Typography sx={{ fontWeight: 600 }}>{a.title ?? `Week ${a.weekNumber} exercise`}</Typography>
                                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.5 }}>
                                    <Chip size="small" label={status.label} color={status.color} variant="outlined" />
                                    <Typography variant="caption" color="text.secondary">
                                      {gradedHere > 0
                                        ? `${a.passedCount} passing · ${a.failingCount} failing`
                                        : 'No graded runs yet'}
                                    </Typography>
                                  </Stack>
                                </TableCell>
                                <TableCell>
                                  {a.deadline ? (
                                    <>
                                      <Typography variant="body2" sx={mono}>
                                        {fmtDate(a.deadline)}
                                      </Typography>
                                      <Typography variant="caption" color={a.isPastDeadline ? 'warning.main' : 'text.secondary'}>
                                        {a.isPastDeadline ? 'Past due' : 'Upcoming'}
                                      </Typography>
                                    </>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">
                                      No deadline
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell sx={{ minWidth: 200 }}>
                                  <StackedBar tally={a} />
                                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                    {a.submissionCount === 0
                                      ? `No one has started · 0 of ${a.enrolledCount}`
                                      : `${a.submissionCount} of ${a.enrolledCount} started`}
                                    {a.failedProvisionCount > 0 && ` · ${a.failedProvisionCount} setup failed`}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Button variant="outlined" size="small" onClick={() => setOpenId(a.id)}>
                                    Manage
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {rows.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5}>
                                <Typography color="text.secondary">No assignments match “{query}”.</Typography>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </Box>
                  </Paper>

                    <Paper variant="outlined" sx={{ p: 2.5, gridArea: 'attention' }}>
                      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          Needs attention
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <Typography variant="caption" color="text.secondary">
                            {flags.length + checks.length}
                          </Typography>
                          <Button size="small" color="inherit" aria-expanded={showAttention} onClick={() => setShowAttention(v => !v)}>
                            {showAttention ? 'Hide' : 'Show'}
                          </Button>
                        </Stack>
                      </Stack>
                      <Collapse in={showAttention}>
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 1.5,
                            mt: 1.5,
                            [WIDE]: { gridTemplateColumns: '1fr' },
                          }}
                        >
                          {flags.length + checks.length === 0 && (
                            <Box sx={{ gridColumn: '1 / -1', border: '1px dashed', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                              <Typography variant="body2" color="text.secondary">
                                Nothing flagged. Setup failures, failing checks and students falling behind a due date
                                show up here, each with a fix.
                              </Typography>
                            </Box>
                          )}
                          {flags.map(f => (
                            <AttentionItem
                              key={f.id}
                              dot="error.main"
                              text={f.text}
                              sub={`W${f.a.weekNumber} · ${f.a.title ?? ''}`}
                              action={f.fix}
                              onAction={() => setOpenId(f.a.id)}
                            />
                          ))}
                          {checks.map(c => (
                            <AttentionItem
                              key={c}
                              dot="warning.main"
                              text={c}
                              action={isAdmin ? 'Open config' : undefined}
                              onAction={() =>
                                document.getElementById('course-config')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                              }
                              hideWide
                            />
                          ))}
                        </Box>
                      </Collapse>
                    </Paper>

                    {isAdmin && (
                      <Paper
                        id="course-config"
                        variant="outlined"
                        sx={{
                          p: 2.5,
                          gridArea: 'config',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 2,
                          [WIDE]: { flexDirection: 'column', alignItems: 'stretch' },
                        }}
                      >
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            Course config
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Re-seed Season {group.season} assignments from the cohort config file.
                          </Typography>
                          {checks.map(c => (
                            <Stack
                              key={c}
                              direction="row"
                              spacing={1.5}
                              sx={{ mt: 1.5, alignItems: 'flex-start', display: 'none', [WIDE]: { display: 'flex' } }}
                            >
                              <Chip size="small" color="warning" variant="outlined" label="CHECK" sx={{ fontSize: 10 }} />
                              <Typography variant="body2">{c}</Typography>
                            </Stack>
                          ))}
                        </Box>
                        <Button variant="outlined" sx={{ flexShrink: 0 }} disabled={sync.isPending} onClick={() => runSync(group)}>
                          Sync Season {group.season}
                        </Button>
                      </Paper>
                    )}

                    {isAdmin && (
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 2.5,
                          gridArea: 'danger',
                          borderColor: 'error.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 2,
                          [WIDE]: { flexDirection: 'column', alignItems: 'stretch' },
                        }}
                      >
                        <Box>
                          <Typography variant="subtitle1" color="error" sx={{ fontWeight: 600 }}>
                            Danger zone
                          </Typography>
                          <Typography variant="body2">
                            Archive all Season {group.season} student repos. Students keep read access; new pushes and
                            check runs stop.
                          </Typography>
                        </Box>
                        <Button color="error" variant="outlined" sx={{ flexShrink: 0 }} disabled={archive.isPending} onClick={() => askArchive(group)}>
                          Archive repos…
                        </Button>
                      </Paper>
                    )}
                  </Box>
                </Box>
              </>
            )}
          </>
        )}
      </Box>

      <Drawer
        anchor="right"
        open={!!openId}
        onClose={() => setOpenId(null)}
        slotProps={{ paper: { sx: { width: { xs: '100vw', sm: 620 } } } }}
      >
        {openId && (
          <SubmissionsPanel
            assignment={(assignments ?? []).find(a => a.id === openId) ?? null}
            isAdmin={isAdmin}
            onClose={() => setOpenId(null)}
            askConfirm={setConfirm}
          />
        )}
      </Drawer>

      <Dialog open={!!confirm} onClose={() => setConfirm(null)}>
        <DialogTitle>{confirm?.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirm?.body}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              confirm?.onConfirm();
              setConfirm(null);
            }}
          >
            {confirm?.action}
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
};

type Pin = 'auto' | 'yes' | 'no';
const toPin = (v: boolean | null): Pin => (v === null ? 'auto' : v ? 'yes' : 'no');
const fromPin = (p: Pin): boolean | null => (p === 'auto' ? null : p === 'yes');

/**
 * "Auto" hands the field to grading; Yes / No pins it for staff, and the pin
 * survives later saves, runs and regrades.
 */
const OverrideCard = ({
  label,
  computed,
  hint,
  value,
  onChange,
}: {
  label: string;
  computed: boolean;
  hint: string;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
}) => (
  <Paper variant="outlined" sx={{ p: 1.5, flex: 1 }}>
    <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 1 }}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="body2" color={value === null ? 'text.secondary' : 'warning.main'}>
        {computed ? 'Yes' : 'No'} · {value === null ? 'auto' : 'set by staff'}
      </Typography>
    </Stack>
    <ToggleButtonGroup
      exclusive
      fullWidth
      size="small"
      value={toPin(value)}
      onChange={(_, p: Pin | null) => p && onChange(fromPin(p))}
      aria-label={`${label} override`}
    >
      <ToggleButton value="auto">Auto</ToggleButton>
      <ToggleButton value="yes">Yes</ToggleButton>
      <ToggleButton value="no">No</ToggleButton>
    </ToggleButtonGroup>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
      {hint}
    </Typography>
  </Paper>
);

type Bucket = 'progress' | 'failing' | 'passed' | 'setup';
type Filter = Bucket | 'all' | 'notstarted';

// Same precedence the API uses for the tallies, so the chips and the cards agree.
const bucketOf = (s: AdminSubmissionResponse): Bucket => {
  if (s.isPassingOverride ?? s.bestRun != null) return 'passed';
  if (s.provisionStatus === ProvisionStatus.FAILED) return 'setup';
  return s.latestRun ? 'failing' : 'progress';
};

const BUCKET_CHIP: Record<Bucket, { label: string; color: ChipColor }> = {
  progress: { label: 'In progress', color: 'info' },
  failing: { label: 'Failing', color: 'error' },
  passed: { label: 'Passed', color: 'success' },
  setup: { label: 'Setup failed', color: 'warning' },
};

const StudentCard = ({
  s,
  isAdmin,
  open,
  onToggle,
  onPin,
  onRetry,
  retrying,
}: {
  s: AdminSubmissionResponse;
  isAdmin: boolean;
  open: boolean;
  onToggle: () => void;
  onPin: (field: 'isSubmitted' | 'isPassing', value: boolean | null) => void;
  onRetry: () => void;
  retrying: boolean;
}) => {
  const bucket = BUCKET_CHIP[bucketOf(s)];
  const name = s.userName ?? s.userId;
  const run = s.latestRun;
  const summary = [
    PROVISION_CHIP[s.provisionStatus].label === 'Ready' ? 'Repo ready' : PROVISION_CHIP[s.provisionStatus].label,
    s.isSubmitted ? 'submitted' : 'not submitted',
    run?.testsTotal != null ? `${run.testsPassed ?? 0}/${run.testsTotal} tests` : 'no graded runs',
  ].join(' · ');

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack
        direction="row"
        spacing={1.5}
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onToggle()}
        sx={{ alignItems: 'center', cursor: 'pointer' }}
      >
        <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>{name.charAt(0).toUpperCase()}</Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 600 }}>{name}</Typography>
          <Typography variant="caption" color="text.secondary">
            {summary}
          </Typography>
        </Box>
        <Chip size="small" label={bucket.label} color={bucket.color} variant="outlined" />
        <IconButton
          size="small"
          aria-label={open ? `Collapse ${name}` : `Expand ${name}`}
          tabIndex={-1}
          sx={{ width: 28, height: 28, p: 0, flexShrink: 0, fontSize: 14, lineHeight: 1 }}
        >
          <ExpandMoreIcon fontSize="small" sx={{ transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }} />
        </IconButton>
      </Stack>

      <Collapse in={open} unmountOnExit>
        <Stack spacing={1.5} sx={{ mt: 2 }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', bgcolor: 'action.hover', borderRadius: 1, px: 1.5, py: 1 }}
          >
            <Typography variant="body2" sx={{ ...mono, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.repoFullName ?? 'No repo yet'}
            </Typography>
            {s.repoFullName && (
              <Button size="small" color="inherit" onClick={() => void navigator.clipboard?.writeText(s.repoFullName!)}>
                Copy
              </Button>
            )}
            {s.repoHtmlUrl && (
              <Button size="small" href={s.repoHtmlUrl} target="_blank" rel="noreferrer" endIcon={<OpenInNewIcon fontSize="small" />}>
                Open repo
              </Button>
            )}
          </Stack>

          {s.lastCommitAt && (
            <Typography variant="caption" color="text.secondary">
              Last commit {new Date(s.lastCommitAt).toLocaleString()}
            </Typography>
          )}

          {s.provisionError && (
            <Alert severity="error" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12 }}>
              {s.provisionError}
            </Alert>
          )}

          {isAdmin ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <OverrideCard
                label="Submitted"
                computed={s.isSubmitted}
                hint="Auto turns Yes once the student commits their own changes."
                value={s.isSubmittedOverride}
                onChange={v => onPin('isSubmitted', v)}
              />
              <OverrideCard
                label="Passing"
                computed={s.isPassing}
                hint="Auto turns Yes once a graded run passes."
                value={s.isPassingOverride}
                onChange={v => onPin('isPassing', v)}
              />
            </Stack>
          ) : (
            <Typography variant="body2">
              Submitted: <b>{s.isSubmitted ? 'Yes' : 'No'}</b> · Passing: <b>{s.isPassing ? 'Yes' : 'No'}</b>
            </Typography>
          )}

          {s.provisionStatus === ProvisionStatus.FAILED && (
            <Button size="small" variant="outlined" sx={{ alignSelf: 'flex-start' }} disabled={retrying} onClick={onRetry}>
              Retry setup
            </Button>
          )}
        </Stack>
      </Collapse>
    </Paper>
  );
};

const SubmissionsPanel = ({
  assignment,
  isAdmin,
  onClose,
  askConfirm,
}: {
  assignment: AdminAssignmentResponse | null;
  isAdmin: boolean;
  onClose: () => void;
  askConfirm: (c: Confirm) => void;
}) => {
  const assignmentId = assignment?.id ?? '';
  const { data: submissions, isLoading, isError, error } = useAdminSubmissions(assignmentId, {
    enabled: !!assignment,
  });
  const regrade = useRegradeAssignment();
  const reprovision = useReprovisionSubmission();
  const override = useOverrideSubmissionScore();
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (!assignment) return null;

  const onRegrade = () =>
    askConfirm({
      title: 'Re-grade failing submissions?',
      body: 'Every submission that has not passed is graded again. Use this after fixing a grader bug.',
      action: 'Re-grade',
      onConfirm: () =>
        regrade.mutate(assignmentId, {
          onSuccess: r => setMessage(`Dispatched ${r.dispatched}, skipped ${r.skipped}.`),
          onError: e => setMessage(extractErrorMessage(e)),
        }),
    });

  const setPin = (s: AdminSubmissionResponse, field: 'isSubmitted' | 'isPassing', value: boolean | null) =>
    override.mutate(
      { submissionId: s.id, assignmentId, body: { [field]: value } },
      { onError: e => setMessage(extractErrorMessage(e)) }
    );

  const toggle = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const q = search.trim().toLowerCase();
  const visible = (submissions ?? []).filter(
    s =>
      (filter === 'all' || filter === bucketOf(s)) &&
      (!q || (s.userName ?? s.userId).toLowerCase().includes(q))
  );

  const chips: { key: Filter; label: string; count: number; color: string }[] = [
    { key: 'all', label: 'All', count: assignment.enrolledCount, color: 'text.secondary' },
    { key: 'progress', label: 'In progress', count: assignment.inProgressCount, color: 'info.main' },
    { key: 'failing', label: 'Failing', count: assignment.failingCount, color: 'error.main' },
    { key: 'passed', label: 'Passed', count: assignment.passedCount, color: 'success.main' },
    ...(assignment.failedProvisionCount > 0
      ? [{ key: 'setup' as Filter, label: 'Setup failed', count: assignment.failedProvisionCount, color: 'warning.main' }]
      : []),
    { key: 'notstarted', label: 'Not started', count: assignment.notStartedCount, color: 'action.disabled' },
  ];
  const showNotStarted = assignment.notStartedCount > 0 && (filter === 'all' || filter === 'notstarted');
  const status = STATUS_CHIP[assignment.status];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ p: 3, pb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="overline" color="text.secondary">
              W{assignment.weekNumber} · Season {assignment.cohortSeason} · {cohortTypeToName(assignment.cohortType)}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {assignment.title ?? `Week ${assignment.weekNumber} exercise`}
            </Typography>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mt: 0.75, flexWrap: 'wrap' }}>
              <Chip size="small" label={status.label} color={status.color} variant="outlined" />
              {assignment.deadline && (
                <Typography variant="body2" color="text.secondary">
                  Due <span style={mono}>{new Date(assignment.deadline).toLocaleString()}</span>{' '}
                  <Box component="span" sx={{ color: assignment.isPastDeadline ? 'warning.main' : 'text.secondary' }}>
                    {assignment.isPastDeadline ? 'Past due' : 'Upcoming'}
                  </Box>
                </Typography>
              )}
            </Stack>
          </Box>
          <IconButton onClick={onClose} aria-label="Close" size="small" sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Box sx={{ mt: 2 }}>
          <StackedBar tally={assignment} height={6} />
        </Box>
        <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
          {chips.map(c => (
            <Chip
              key={c.key}
              clickable
              variant="outlined"
              color={filter === c.key ? 'primary' : 'default'}
              onClick={() => setFilter(c.key)}
              label={
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: c.color }} />
                  <span>{c.label}</span>
                  <span style={mono}>{c.count}</span>
                </Stack>
              }
            />
          ))}
        </Stack>

        <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
          <TextField
            size="small"
            fullWidth
            placeholder={`Search ${assignment.submissionCount} students`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            slotProps={{
              htmlInput: { 'aria-label': 'Search students' },
              input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> },
            }}
          />
          <Button
            variant="outlined"
            sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            disabled={regrade.isPending || assignment.failingCount + assignment.inProgressCount === 0}
            onClick={onRegrade}
          >
            {regrade.isPending ? 'Re-grading…' : `Re-grade failing ${assignment.failingCount}`}
          </Button>
        </Stack>
      </Box>

      <Stack spacing={1.5} sx={{ p: 3, overflow: 'auto', flex: 1 }}>
        {message && (
          <Alert severity="info" onClose={() => setMessage(null)}>
            {message}
          </Alert>
        )}
        {isLoading && <CircularProgress size={24} aria-label="Loading submissions" />}
        {isError && <Alert severity="error">{extractErrorMessage(error)}</Alert>}

        {visible.map(s => (
          <StudentCard
            key={s.id}
            s={s}
            isAdmin={isAdmin}
            open={expanded.has(s.id)}
            onToggle={() => toggle(s.id)}
            onPin={(field, v) => setPin(s, field, v)}
            onRetry={() =>
              reprovision.mutate(
                { submissionId: s.id, assignmentId },
                { onError: e => setMessage(extractErrorMessage(e)) }
              )
            }
            retrying={reprovision.isPending}
          />
        ))}
        {submissions && visible.length === 0 && filter !== 'notstarted' && (
          <Typography color="text.secondary">
            {submissions.length === 0 ? 'No students have started this assignment.' : 'No students match.'}
          </Typography>
        )}

        {showNotStarted && (
          <Paper variant="outlined" sx={{ p: 2, borderStyle: 'dashed', bgcolor: 'transparent' }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Avatar sx={{ width: 32, height: 32, fontSize: 13 }}>{assignment.notStartedCount}</Avatar>
              <Box>
                <Typography sx={{ fontWeight: 600 }}>Not started</Typography>
                <Typography variant="caption" color="text.secondary">
                  No repo created yet{assignment.isPastDeadline ? ' · past the due date' : ''}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        )}
      </Stack>
    </Box>
  );
};

export default AdminAssignmentsPage;
