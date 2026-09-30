import { useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  type AdminAssignmentResponse,
  type AdminSubmissionResponse,
  ProvisionStatus,
  type SubmissionBucket,
  submissionBucket,
} from '@nonce/shared';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SearchIcon from '@mui/icons-material/Search';
import {
  ASSIGNMENT_STATUS_CHIP,
  PROVISION_CHIP,
  type ChipColor,
} from '../../components/assignment/chips.ts';
import { fontFamilyMono } from '../../components/fellowship/theme.ts';
import { cohortTypeToName } from '../../helpers/cohortHelpers.ts';
import {
  useAdminSubmissions,
  useOverrideSubmissionScore,
  useRegradeAssignment,
  useReprovisionSubmission,
} from '../../hooks/assignmentHooks.ts';
import { formatDateTime } from '../../utils/dateUtils.ts';
import { extractErrorMessage } from '../../utils/errorUtils.ts';
import { StackedBar } from './AssignmentBars.tsx';

export interface Confirm {
  title: string;
  body: string;
  action: string;
  onConfirm: () => void;
}

type Pin = 'auto' | 'yes' | 'no';
const toPin = (v: boolean | null): Pin =>
  v === null ? 'auto' : v ? 'yes' : 'no';
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
      <Typography
        variant="body2"
        color={value === null ? 'text.secondary' : 'warning.main'}
      >
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
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ display: 'block', mt: 1 }}
    >
      {hint}
    </Typography>
  </Paper>
);

type Filter = SubmissionBucket | 'all' | 'notstarted';

const BUCKET_CHIP: Record<
  SubmissionBucket,
  { label: string; color: ChipColor }
> = {
  inProgress: { label: 'In progress', color: 'info' },
  failing: { label: 'Failing', color: 'error' },
  passed: { label: 'Passed', color: 'success' },
  setupFailed: { label: 'Setup failed', color: 'warning' },
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
  const bucket = BUCKET_CHIP[submissionBucket(s)];
  const name = s.userName ?? s.userId;
  const run = s.latestRun;
  const summary = [
    s.provisionStatus === ProvisionStatus.READY
      ? 'Repo ready'
      : PROVISION_CHIP[s.provisionStatus].label,
    s.isSubmitted ? 'submitted' : 'not submitted',
    run?.testsTotal != null
      ? `${run.testsPassed ?? 0}/${run.testsTotal} tests`
      : 'no graded runs',
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
        <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>
          {name.charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 600 }}>{name}</Typography>
          <Typography variant="caption" color="text.secondary">
            {summary}
          </Typography>
        </Box>
        <Chip
          size="small"
          label={bucket.label}
          color={bucket.color}
          variant="outlined"
        />
        <IconButton
          size="small"
          aria-label={open ? `Collapse ${name}` : `Expand ${name}`}
          tabIndex={-1}
          sx={{
            width: 28,
            height: 28,
            p: 0,
            flexShrink: 0,
            fontSize: 14,
            lineHeight: 1,
          }}
        >
          <ExpandMoreIcon
            fontSize="small"
            sx={{
              transition: 'transform .2s',
              transform: open ? 'rotate(180deg)' : 'none',
            }}
          />
        </IconButton>
      </Stack>

      <Collapse in={open} unmountOnExit>
        <Stack spacing={1.5} sx={{ mt: 2 }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: 'center',
              bgcolor: 'action.hover',
              borderRadius: 1,
              px: 1.5,
              py: 1,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontFamily: fontFamilyMono,
                flex: 1,
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {s.repoFullName ?? 'No repo yet'}
            </Typography>
            {s.repoFullName && (
              <Button
                size="small"
                color="inherit"
                onClick={() =>
                  void navigator.clipboard?.writeText(s.repoFullName!)
                }
              >
                Copy
              </Button>
            )}
            {s.repoHtmlUrl && (
              <Button
                size="small"
                href={s.repoHtmlUrl}
                target="_blank"
                rel="noreferrer"
                endIcon={<OpenInNewIcon fontSize="small" />}
              >
                Open repo
              </Button>
            )}
          </Stack>

          {s.lastCommitAt && (
            <Typography variant="caption" color="text.secondary">
              Last commit {formatDateTime(s.lastCommitAt)}
            </Typography>
          )}

          {s.provisionError && (
            <Alert
              severity="error"
              sx={{
                whiteSpace: 'pre-wrap',
                fontFamily: fontFamilyMono,
                fontSize: 12,
              }}
            >
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
              Submitted: <b>{s.isSubmitted ? 'Yes' : 'No'}</b> · Passing:{' '}
              <b>{s.isPassing ? 'Yes' : 'No'}</b>
            </Typography>
          )}

          {s.provisionStatus === ProvisionStatus.FAILED && (
            <Button
              size="small"
              variant="outlined"
              sx={{ alignSelf: 'flex-start' }}
              disabled={retrying}
              onClick={onRetry}
            >
              Retry setup
            </Button>
          )}
        </Stack>
      </Collapse>
    </Paper>
  );
};

export const SubmissionsPanel = ({
  assignment,
  isAdmin,
  onClose,
  askConfirm,
  isPast,
}: {
  assignment: AdminAssignmentResponse | null;
  isAdmin: boolean;
  onClose: () => void;
  askConfirm: (c: Confirm) => void;
  isPast: (deadline: string | null) => boolean;
}) => {
  const assignmentId = assignment?.id ?? '';
  const {
    data: submissions,
    isLoading,
    isError,
    error,
  } = useAdminSubmissions(assignmentId, {
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
      title: 'Re-grade unpassed submissions?',
      body: 'Every student submission that has not passed and has committed code is graded again. Use this after fixing a grader bug.',
      action: 'Re-grade',
      onConfirm: () =>
        regrade.mutate(assignmentId, {
          onSuccess: r =>
            setMessage(`Dispatched ${r.dispatched}, skipped ${r.skipped}.`),
          onError: e => setMessage(extractErrorMessage(e)),
        }),
    });

  const setPin = (
    s: AdminSubmissionResponse,
    field: 'isSubmitted' | 'isPassing',
    value: boolean | null
  ) =>
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
      (filter === 'all' || filter === submissionBucket(s)) &&
      (!q || (s.userName ?? s.userId).toLowerCase().includes(q))
  );

  const chips: { key: Filter; label: string; count: number; color: string }[] =
    [
      {
        key: 'all',
        label: 'All',
        count: assignment.enrolledCount,
        color: 'text.secondary',
      },
      {
        key: 'inProgress',
        label: 'In progress',
        count: assignment.inProgressCount,
        color: 'info.main',
      },
      {
        key: 'failing',
        label: 'Failing',
        count: assignment.failingCount,
        color: 'error.main',
      },
      {
        key: 'passed',
        label: 'Passed',
        count: assignment.passedCount,
        color: 'success.main',
      },
      ...(assignment.failedProvisionCount > 0
        ? [
            {
              key: 'setupFailed' as Filter,
              label: 'Setup failed',
              count: assignment.failedProvisionCount,
              color: 'warning.main',
            },
          ]
        : []),
      {
        key: 'notstarted',
        label: 'Not started',
        count: assignment.notStartedCount,
        color: 'action.disabled',
      },
    ];
  const showNotStarted =
    assignment.notStartedCount > 0 &&
    (filter === 'all' || filter === 'notstarted');
  const unpassed = assignment.failingCount + assignment.inProgressCount;
  const status = ASSIGNMENT_STATUS_CHIP[assignment.status];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ p: 3, pb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Stack
          direction="row"
          sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}
        >
          <Box>
            <Typography variant="overline" color="text.secondary">
              W{assignment.weekNumber} · Season {assignment.cohortSeason} ·{' '}
              {cohortTypeToName(assignment.cohortType)}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {assignment.title ?? `Week ${assignment.weekNumber} exercise`}
            </Typography>
            <Stack
              direction="row"
              spacing={1.5}
              sx={{ alignItems: 'center', mt: 0.75, flexWrap: 'wrap' }}
            >
              <Chip
                size="small"
                label={status.label}
                color={status.color}
                variant="outlined"
              />
              {assignment.deadline && (
                <Typography variant="body2" color="text.secondary">
                  Due{' '}
                  <Box component="span" sx={{ fontFamily: fontFamilyMono }}>
                    {formatDateTime(assignment.deadline)}
                  </Box>{' '}
                  <Box
                    component="span"
                    sx={{
                      color: isPast(assignment.deadline)
                        ? 'warning.main'
                        : 'text.secondary',
                    }}
                  >
                    {isPast(assignment.deadline) ? 'Past due' : 'Upcoming'}
                  </Box>
                </Typography>
              )}
            </Stack>
          </Box>
          <IconButton
            onClick={onClose}
            aria-label="Close"
            size="small"
            sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Box sx={{ mt: 2 }}>
          <StackedBar tally={assignment} height={6} />
        </Box>
        <Stack
          direction="row"
          useFlexGap
          sx={{ flexWrap: 'wrap', gap: 1, mt: 1.5 }}
        >
          {chips.map(c => (
            <Chip
              key={c.key}
              clickable
              variant="outlined"
              color={filter === c.key ? 'primary' : 'default'}
              onClick={() => setFilter(c.key)}
              label={
                <Stack
                  direction="row"
                  spacing={0.75}
                  sx={{ alignItems: 'center' }}
                >
                  <Box
                    sx={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      bgcolor: c.color,
                    }}
                  />
                  <span>{c.label}</span>
                  <Box component="span" sx={{ fontFamily: fontFamilyMono }}>
                    {c.count}
                  </Box>
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
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Button
            variant="outlined"
            sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            disabled={regrade.isPending || unpassed === 0}
            onClick={onRegrade}
          >
            {regrade.isPending
              ? 'Re-grading…'
              : `Re-grade unpassed ${unpassed}`}
          </Button>
        </Stack>
      </Box>

      <Stack spacing={1.5} sx={{ p: 3, overflow: 'auto', flex: 1 }}>
        {message && (
          <Alert severity="info" onClose={() => setMessage(null)}>
            {message}
          </Alert>
        )}
        {isLoading && (
          <CircularProgress size={24} aria-label="Loading submissions" />
        )}
        {isError && (
          <Alert severity="error">{extractErrorMessage(error)}</Alert>
        )}

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
            {submissions.length === 0
              ? 'No students have started this assignment.'
              : 'No students match.'}
          </Typography>
        )}

        {showNotStarted && (
          <Paper
            variant="outlined"
            sx={{ p: 2, borderStyle: 'dashed', bgcolor: 'transparent' }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Avatar sx={{ width: 32, height: 32, fontSize: 13 }}>
                {assignment.notStartedCount}
              </Avatar>
              <Box>
                <Typography sx={{ fontWeight: 600 }}>Not started</Typography>
                <Typography variant="caption" color="text.secondary">
                  No repo created yet
                  {isPast(assignment.deadline) ? ' · past the due date' : ''}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        )}
      </Stack>
    </Box>
  );
};
