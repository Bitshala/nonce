import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { ProvisionStatus } from '@nonce/shared';
import { AssignmentTheme } from '../../components/assignment/AssignmentTheme.tsx';
import {
  isProvisioning,
  provisionRefetchInterval,
} from '../../components/assignment/provision.ts';
import { fontFamilyMono } from '../../components/fellowship/theme.ts';
import { formatDateTime } from '../../utils/dateUtils.ts';
import {
  useAcceptAssignment,
  useAssignment,
} from '../../hooks/assignmentHooks.ts';
import { extractErrorMessage } from '../../utils/errorUtils.ts';
import { usePageMeta } from '../../hooks/usePageMeta.ts';

/**
 * Assignment detail: the problem statement, and the Start button that
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
    refetchInterval: provisionRefetchInterval,
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

  if (isLoading || isError || !assignment) {
    return (
      <Themed center>
        {isLoading ? (
          <CircularProgress aria-label="Loading assignment" />
        ) : (
          <Alert severity="error">{extractErrorMessage(error)}</Alert>
        )}
      </Themed>
    );
  }

  return (
    <Themed>
      <Paper
        variant="outlined"
        sx={{ width: '100%', maxWidth: 560, p: 3.5, alignSelf: 'flex-start' }}
      >
        <Stack spacing={2.5}>
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
              label={`${assignment.isPastDeadline ? 'Was due' : 'Due'} ${formatDateTime(assignment.deadline)}`}
              sx={{ alignSelf: 'flex-start' }}
            />
          )}

          {assignment.isPastDeadline && (
            <Alert severity="warning">
              The deadline has passed.{' '}
              {assignment.allowLateSubmission
                ? 'You can still edit and run for practice, but runs no longer affect your score.'
                : 'This assignment is closed for changes.'}
            </Alert>
          )}

          {assignment.exercise && (
            <>
              {assignment.exercise.concepts && (
                <Section title="Concepts" body={assignment.exercise.concepts} />
              )}
              {assignment.exercise.problem && (
                <Section title="Problem" body={assignment.exercise.problem} />
              )}
              {assignment.exercise.expectedOutput.length > 0 && (
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
            </>
          )}

          <Stack
            spacing={1}
            sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}
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
                  This creates your private workspace. You will edit and run
                  everything here — there is nothing to clone or install.
                </Typography>
                {acceptAssignment.isError && (
                  <Alert severity="error">
                    {extractErrorMessage(acceptAssignment.error)}
                  </Alert>
                )}
              </>
            )}

            {isProvisioning(submission?.provisionStatus) && (
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
                We could not create your workspace. Please contact an admin and
                mention this assignment.
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
        </Stack>
      </Paper>
    </Themed>
  );
};

const Themed = ({
  children,
  center,
}: {
  children: React.ReactNode;
  center?: boolean;
}) => (
  <AssignmentTheme>
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        color: 'text.primary',
        display: 'flex',
        justifyContent: 'center',
        alignItems: center ? 'center' : 'flex-start',
        p: { xs: 2, md: 6 },
      }}
    >
      {children}
    </Box>
  </AssignmentTheme>
);

const Section = ({ title, body }: { title: string; body: string }) => (
  <Box>
    <Typography variant="overline" color="text.secondary">
      {title}
    </Typography>
    <Typography color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
      {body}
    </Typography>
  </Box>
);

export default AssignmentPage;
