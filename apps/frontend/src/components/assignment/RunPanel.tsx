import { Box, Chip, CircularProgress, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import RemoveIcon from '@mui/icons-material/Remove';
import ScheduleIcon from '@mui/icons-material/Schedule';
import type { CIRunDetailResponse } from '@nonce/shared';
import { CIRunStatus } from '@nonce/shared';
import { fontFamilyMono } from '../fellowship/theme';
import { describeRun, isTerminal } from './runStatus';
import { WORKSPACE } from './workspaceColors';

interface Props {
  run: CIRunDetailResponse | undefined;
  isDispatching: boolean;
  /** The brief's "You're done when" list, shown before any report exists. */
  checks?: string[];
}

interface CheckRow {
  name: string;
  state: 'pending' | 'running' | 'passed' | 'failed';
  message?: string | null;
}

/**
 * Checks for one grading run: the "You're done when" list with per-check
 * status. Run detail (steps, log) lives in `RunOutput`, under the editor.
 */
export const RunPanel = ({ run, isDispatching, checks = [] }: Props) => {
  const isLive = !!run && !isTerminal(run.status);
  const tests = run?.report?.tests ?? [];

  let rows: CheckRow[];
  if (tests.length > 0) {
    rows = tests.map(test => ({
      name: test.name,
      state:
        test.status === 'success' || test.status === 'passed'
          ? 'passed'
          : 'failed',
      message: test.message,
    }));
  } else {
    const state = isDispatching || isLive ? 'running' : 'pending';
    rows = checks.map(name => ({ name, state }));
  }

  const passedCount = rows.filter(row => row.state === 'passed').length;
  const summary =
    tests.length > 0
      ? 'graded'
      : isDispatching || isLive
        ? 'running'
        : 'not run';

  return (
    <Box
      sx={{
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        px: 2.5,
        py: 2.25,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 1.5 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 700, flex: 1 }}>
          Checks
        </Typography>
        <Typography
          sx={{
            fontFamily: fontFamilyMono,
            fontSize: 12,
            color: 'text.secondary',
          }}
        >
          {passedCount}/{rows.length} · {summary}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: '4px', mb: 1 }} aria-hidden>
        {rows.map((row, index) => (
          <Box
            key={index}
            sx={{
              flex: 1,
              height: 4,
              borderRadius: 99,
              bgcolor: CHECK_STATE[row.state].bar,
            }}
          />
        ))}
      </Box>

      {rows.map((row, index) => (
        <CheckItem
          key={`${index}-${row.name}`}
          row={row}
          index={index}
          last={index === rows.length - 1}
        />
      ))}

      <Typography
        sx={{
          fontSize: 12.5,
          lineHeight: '18px',
          color: 'text.secondary',
          mt: 2,
        }}
      >
        From the brief&rsquo;s &ldquo;You&rsquo;re done when&rdquo;. Checks run
        on your latest save.
      </Typography>
    </Box>
  );
};

const CHECK_STATE = {
  pending: {
    label: 'Not run yet',
    color: 'text.secondary',
    bar: WORKSPACE.line,
  },
  running: { label: 'Running…', color: 'info.main', bar: '#60a5fa' },
  passed: { label: 'Passed', color: 'success.main', bar: '#4ade80' },
  failed: { label: 'Failed', color: 'error.main', bar: '#f87171' },
} as const;

const CheckItem = ({
  row,
  index,
  last,
}: {
  row: CheckRow;
  index: number;
  last: boolean;
}) => (
  <Box
    sx={{
      display: 'flex',
      gap: 1.5,
      py: 1.75,
      borderBottom: last ? 'none' : `1px solid ${WORKSPACE.line}`,
    }}
  >
    <Box
      sx={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        flexShrink: 0,
        mt: '-1px',
        display: 'grid',
        placeItems: 'center',
        border: '1px solid',
        borderColor:
          row.state === 'pending'
            ? WORKSPACE.lineStrong
            : CHECK_STATE[row.state].bar,
        fontFamily: fontFamilyMono,
        fontSize: 10.5,
        color:
          row.state === 'pending'
            ? WORKSPACE.muted
            : CHECK_STATE[row.state].color,
      }}
    >
      {row.state === 'passed' ? (
        <CheckIcon sx={{ fontSize: 12 }} />
      ) : row.state === 'failed' ? (
        <CloseIcon sx={{ fontSize: 12 }} />
      ) : (
        index + 1
      )}
    </Box>
    <Box sx={{ minWidth: 0, flex: 1 }}>
      <Typography
        sx={{
          fontSize: 14,
          lineHeight: '19px',
          fontWeight: 500,
          wordBreak: 'break-word',
        }}
      >
        {row.name}
      </Typography>
      <Typography
        sx={{ fontSize: 12.5, mt: '2px', color: CHECK_STATE[row.state].color }}
      >
        {CHECK_STATE[row.state].label}
      </Typography>
      {row.state === 'failed' && row.message && (
        <Box
          component="pre"
          sx={{
            m: 0,
            mt: 0.75,
            fontFamily: fontFamilyMono,
            fontSize: 11.5,
            color: 'error.main',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {row.message}
        </Box>
      )}
    </Box>
  </Box>
);

export const RunOutput = ({
  run,
  logs,
  isDispatching,
}: {
  run: CIRunDetailResponse | undefined;
  logs: string | undefined;
  isDispatching: boolean;
}) => {
  if (!run) {
    return (
      <Box sx={{ p: 2, display: 'flex', gap: 1.5, alignItems: 'center' }}>
        {isDispatching && <CircularProgress size={16} />}
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
          {isDispatching
            ? 'Dispatching…'
            : 'Run checks to see the grader output here.'}
        </Typography>
      </Box>
    );
  }
  if (run.status === CIRunStatus.ORPHANED) {
    return (
      <Typography sx={{ p: 2, fontSize: 13, color: 'error.main' }}>
        We lost track of this run on GitHub. Press Run again.
      </Typography>
    );
  }
  return (
    <Box sx={{ px: 2, pb: 2 }}>
      <RunDetail run={run} logs={logs} isLive={!isTerminal(run.status)} />
    </Box>
  );
};

const RunDetail = ({
  run,
  logs,
  isLive,
}: {
  run: CIRunDetailResponse;
  logs: string | undefined;
  isLive: boolean;
}) => (
  <Box>
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'wrap',
        mb: 1,
      }}
    >
      <StatusChip run={run} />

      {/* The org-wide concurrent job cap is shared, so a queued run is normal
          at a deadline. Saying so stops it reading as a hang. */}
      {run.status === CIRunStatus.QUEUED && (
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
          Waiting for a runner — this queues when many students run at once.
        </Typography>
      )}

      {run.testsTotal !== null && (
        <Typography
          sx={{
            fontFamily: fontFamilyMono,
            fontSize: 12,
            color: 'text.secondary',
          }}
        >
          {run.testsPassed}/{run.testsTotal} tests
        </Typography>
      )}

      {/* A late run still runs and still shows results; it just cannot move
          the score. Saying that up front avoids a nasty surprise. */}
      {!run.countsForScore && (
        <Chip
          size="small"
          label="Practice only — after the deadline"
          sx={{ height: 20, fontSize: 11 }}
        />
      )}

      <Box sx={{ flex: 1 }} />

      {run.githubRunUrl && (
        <Typography
          component="a"
          href={run.githubRunUrl}
          target="_blank"
          rel="noreferrer"
          sx={{ fontSize: 11.5, color: 'text.secondary' }}
        >
          View on GitHub
        </Typography>
      )}
    </Box>

    {run.jobs.map(job => (
      <Box key={job.id} sx={{ mb: 1.5 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.5 }}>
          {job.name}
        </Typography>
        {job.steps.map(step => (
          <Box
            key={`${job.id}-${step.number}`}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              py: 0.25,
              pl: 1,
            }}
          >
            <StepIcon status={step.status} conclusion={step.conclusion} />
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              {step.name}
            </Typography>
          </Box>
        ))}
      </Box>
    ))}

    {isLive && run.jobs.length === 0 && (
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
        <CircularProgress size={16} />
        <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
          Starting…
        </Typography>
      </Box>
    )}

    {logs && (
      <Box sx={{ mt: 1.5 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.75 }}>
          Log
        </Typography>
        <Box
          component="pre"
          sx={{
            fontFamily: fontFamilyMono,
            fontSize: 11.5,
            lineHeight: 1.5,
            color: 'text.secondary',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            m: 0,
          }}
        >
          {logs}
        </Box>
      </Box>
    )}
  </Box>
);

const StatusChip = ({ run }: { run: CIRunDetailResponse }) => {
  const { label, color } = describeRun(run);
  return (
    <Chip
      size="small"
      label={label}
      sx={{
        height: 22,
        fontSize: 11.5,
        fontWeight: 600,
        bgcolor: 'action.selected',
        color,
      }}
    />
  );
};

const StepIcon = ({
  status,
  conclusion,
}: {
  status: string;
  conclusion: string | null;
}) => {
  if (status !== 'completed') {
    return status === 'in_progress' ? (
      <CircularProgress size={11} />
    ) : (
      <ScheduleIcon sx={{ fontSize: 13, opacity: 0.5 }} />
    );
  }
  if (conclusion === 'success' || conclusion === 'passed') {
    return <CheckIcon sx={{ fontSize: 13 }} color="success" />;
  }
  if (conclusion === 'skipped')
    return <RemoveIcon sx={{ fontSize: 13, opacity: 0.5 }} />;
  return <CloseIcon sx={{ fontSize: 13 }} color="error" />;
};
