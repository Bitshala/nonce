import { Box, Chip, CircularProgress, Typography } from '@mui/material';
import { Check, Clock, Minus, X } from 'lucide-react';
import type { CIRunDetailResponse } from '@nonce/shared';
import { CIRunConclusion, CIRunStatus } from '@nonce/shared';
import { fontFamilyMono } from '../fellowship/theme';

interface Props {
  run: CIRunDetailResponse | undefined;
  logs: string | undefined;
  isDispatching: boolean;
}

/**
 * Live view of one grading run: the step checklist while it runs, then the test
 * report and log once it finishes.
 *
 * The checklist is driven by GitHub `workflow_job` events the backend mirrors
 * onto the run, so it stays useful even before any test has reported.
 */
export const RunPanel = ({ run, logs, isDispatching }: Props) => {
  if (isDispatching && !run) {
    return (
      <Centered>
        <CircularProgress size={20} />
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
          Dispatching…
        </Typography>
      </Centered>
    );
  }

  if (!run) {
    return (
      <Centered>
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
          Press Run to grade your latest save.
        </Typography>
      </Centered>
    );
  }

  if (run.status === CIRunStatus.ORPHANED) {
    return (
      <Centered>
        <Typography sx={{ fontSize: 13, color: 'error.main' }}>
          We lost track of this run on GitHub. Press Run again.
        </Typography>
      </Centered>
    );
  }

  const isLive = !isTerminal(run.status);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1.25,
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexWrap: 'wrap',
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

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {run.jobs.length > 0 && (
          <Box sx={{ px: 2, py: 1.5 }}>
            {run.jobs.map(job => (
              <Box key={job.id} sx={{ mb: 1.5 }}>
                <Typography
                  sx={{ fontSize: 12, fontWeight: 600, mb: 0.5 }}
                >
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
                    <StepIcon
                      status={step.status}
                      conclusion={step.conclusion}
                    />
                    <Typography
                      sx={{ fontSize: 12, color: 'text.secondary' }}
                    >
                      {step.name}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ))}
          </Box>
        )}

        {run.report && run.report.tests.length > 0 && (
          <Box
            sx={{
              px: 2,
              py: 1.5,
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.75 }}>
              Tests
            </Typography>
            {run.report.tests.map(test => (
              <Box key={test.name} sx={{ py: 0.4, pl: 1 }}>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <StepIcon status="completed" conclusion={test.status} />
                  <Typography sx={{ fontSize: 12 }}>{test.name}</Typography>
                </Box>
                {test.message && (
                  <Typography
                    sx={{
                      fontFamily: fontFamilyMono,
                      fontSize: 11.5,
                      color: 'error.main',
                      whiteSpace: 'pre-wrap',
                      pl: 3,
                      mt: 0.25,
                    }}
                  >
                    {test.message}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        )}

        {logs && (
          <Box
            sx={{
              px: 2,
              py: 1.5,
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
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

        {isLive && run.jobs.length === 0 && (
          <Centered>
            <CircularProgress size={18} />
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
              Starting…
            </Typography>
          </Centered>
        )}
      </Box>
    </Box>
  );
};

const Centered = ({ children }: { children: React.ReactNode }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 1.5,
      p: 3,
    }}
  >
    {children}
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
        bgcolor: `${color}22`,
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
      <Clock size={12} opacity={0.5} />
    );
  }
  if (conclusion === 'success' || conclusion === 'passed') {
    return <Check size={12} color="#4ade80" />;
  }
  if (conclusion === 'skipped') return <Minus size={12} opacity={0.5} />;
  return <X size={12} color="#f87171" />;
};

function isTerminal(status: CIRunStatus): boolean {
  return (
    status === CIRunStatus.COMPLETED || status === CIRunStatus.ORPHANED
  );
}

function describeRun(run: CIRunDetailResponse): {
  label: string;
  color: string;
} {
  if (run.status !== CIRunStatus.COMPLETED) {
    return { label: run.status.replace('_', ' ').toLowerCase(), color: '#60a5fa' };
  }
  if (run.conclusion === CIRunConclusion.SUCCESS) {
    return { label: 'passed', color: '#4ade80' };
  }
  if (run.conclusion === CIRunConclusion.TIMED_OUT) {
    return { label: 'timed out', color: '#fbbf24' };
  }
  return { label: 'failed', color: '#f87171' };
}
