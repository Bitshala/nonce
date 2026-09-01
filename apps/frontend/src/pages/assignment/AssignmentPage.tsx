import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Typography,
} from '@mui/material';
import { ProvisionStatus } from '@nonce/shared';
import { FellowshipPageLayout } from '../../components/fellowship/FellowshipPageLayout.tsx';
import { fontFamilyMono } from '../../components/fellowship/theme.ts';
import {
  useAcceptAssignment,
  useAssignment,
} from '../../hooks/assignmentHooks.ts';
import { extractErrorMessage } from '../../utils/errorUtils.ts';
import { usePageMeta } from '../../hooks/usePageMeta.ts';

/** How often to re-check while a repository is being created. */
const PROVISION_POLL_MS = 2000;

/**
 * Assignment detail: the problem statement, and the Accept button that
 * provisions the student's repository.
 *
 * Accepting is asynchronous — a background task creates the repo from a
 * template — so this page polls until the repo is ready and only then offers
 * the editor.
 */
export const AssignmentPage = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();

  const {
    data: assignment,
    isLoading,
    isError,
    error,
  } = useAssignment(assignmentId ?? '', {
    enabled: !!assignmentId,
    // Only poll while a repository is actually being created.
    refetchInterval: query => {
      const status = query.state.data?.submission?.provisionStatus;
      return status === ProvisionStatus.PENDING ||
        status === ProvisionStatus.PROVISIONING
        ? PROVISION_POLL_MS
        : false;
    },
  });

  const acceptAssignment = useAcceptAssignment();

  usePageMeta(
    assignment?.title ? `${assignment.title} — Exercise` : 'Exercise'
  );

  const submission = assignment?.submission ?? null;
  const isReady = submission?.provisionStatus === ProvisionStatus.READY;

  // Once the repo exists there is nothing left on this page to do.
  useEffect(() => {
    if (isReady && assignmentId) {
      navigate(`/assignments/${assignmentId}/editor`, { replace: true });
    }
  }, [isReady, assignmentId, navigate]);

  if (isLoading) {
    return (
      <FellowshipPageLayout>
        <CircularProgress />
      </FellowshipPageLayout>
    );
  }

  if (isError || !assignment) {
    return (
      <FellowshipPageLayout>
        <Alert severity="error">{extractErrorMessage(error)}</Alert>
      </FellowshipPageLayout>
    );
  }

  return (
    <FellowshipPageLayout
      title={assignment.title ?? `Week ${assignment.weekNumber} exercise`}
      subtitle={`Week ${assignment.weekNumber} · Season ${assignment.cohortSeason}`}
      badge={assignment.slug}
      hideIcon
    >
      <Box sx={{ maxWidth: 900 }}>
        {assignment.deadline && (
          <Chip
            size="small"
            label={`Due ${new Date(assignment.deadline).toLocaleString()}`}
            color={assignment.isPastDeadline ? 'default' : 'primary'}
            sx={{ mb: 2 }}
          />
        )}

        {assignment.isPastDeadline && (
          <Alert severity="info" sx={{ mb: 3 }}>
            The deadline has passed.{' '}
            {assignment.allowLateSubmission
              ? 'You can still edit and run for practice, but runs no longer affect your score.'
              : 'This assignment is closed for changes.'}
          </Alert>
        )}

        {assignment.exercise && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Section title="Concepts" body={assignment.exercise.concepts} />
            <Section title="Problem" body={assignment.exercise.problem} />
            {assignment.exercise.expectedOutput.length > 0 && (
              <>
                <Typography
                  sx={{ fontSize: 13, fontWeight: 700, mt: 2, mb: 0.5 }}
                >
                  Expected output
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    fontFamily: fontFamilyMono,
                    fontSize: 12.5,
                    bgcolor: 'rgba(255,255,255,0.04)',
                    p: 1.5,
                    borderRadius: 1,
                    whiteSpace: 'pre-wrap',
                    m: 0,
                  }}
                >
                  {assignment.exercise.expectedOutput.join('\n')}
                </Box>
              </>
            )}
          </Paper>
        )}

        {!submission && (
          <Box>
            <Button
              variant="contained"
              disabled={
                acceptAssignment.isPending ||
                (assignment.isPastDeadline && !assignment.allowLateSubmission)
              }
              onClick={() => acceptAssignment.mutate(assignment.id)}
            >
              {acceptAssignment.isPending ? 'Accepting…' : 'Accept assignment'}
            </Button>
            <Typography
              sx={{ fontSize: 12.5, color: 'text.secondary', mt: 1 }}
            >
              This creates your private workspace. You will edit and run
              everything here — there is nothing to clone or install.
            </Typography>
            {acceptAssignment.isError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {extractErrorMessage(acceptAssignment.error)}
              </Alert>
            )}
          </Box>
        )}

        {submission &&
          (submission.provisionStatus === ProvisionStatus.PENDING ||
            submission.provisionStatus === ProvisionStatus.PROVISIONING) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <CircularProgress size={18} />
              <Typography sx={{ fontSize: 13.5 }}>
                Setting up your workspace…
              </Typography>
            </Box>
          )}

        {submission?.provisionStatus === ProvisionStatus.FAILED && (
          <Alert severity="error">
            We could not create your workspace. Please contact an admin and
            mention this assignment.
            {submission.provisionError && (
              <Box
                component="pre"
                sx={{
                  fontFamily: fontFamilyMono,
                  fontSize: 11.5,
                  mt: 1,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {submission.provisionError}
              </Box>
            )}
          </Alert>
        )}
      </Box>
    </FellowshipPageLayout>
  );
};

const Section = ({ title, body }: { title: string; body: string }) => (
  <Box sx={{ mb: 2 }}>
    <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.5 }}>
      {title}
    </Typography>
    <Typography
      sx={{ fontSize: 13.5, color: 'text.secondary', whiteSpace: 'pre-wrap' }}
    >
      {body}
    </Typography>
  </Box>
);

export default AssignmentPage;
