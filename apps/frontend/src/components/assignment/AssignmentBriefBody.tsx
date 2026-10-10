import {
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { type AssignmentDetailResponse, ProvisionStatus } from '@nonce/shared';
import { useAcceptAssignment } from '../../hooks/assignmentHooks.ts';
import { formatDateTime } from '../../utils/dateUtils.ts';
import { extractErrorMessage } from '../../utils/errorUtils.ts';
import { fontFamilyMono } from '../fellowship/theme.ts';
import { isProvisioning } from './provision.ts';

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

/**
 * The assignment brief and its Start button, shared by the full page and the
 * drawer on the assignments list. The caller supplies the container and
 * navigates away once the repository is ready.
 */
export const AssignmentBriefBody = ({
  assignment,
}: {
  assignment: AssignmentDetailResponse;
}) => {
  const acceptAssignment = useAcceptAssignment();
  const { submission, exercise } = assignment;

  return (
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

      {exercise?.concepts && (
        <Section title="Concepts" body={exercise.concepts} />
      )}
      {exercise?.problem && <Section title="Problem" body={exercise.problem} />}
      {exercise && exercise.expectedOutput.length > 0 && (
        <Box>
          <Typography variant="overline" color="text.secondary">
            You're done when
          </Typography>
          <List dense disablePadding>
            {exercise.expectedOutput.map((line, i) => (
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
                acceptAssignment.isPending || !assignment.isOpenForSubmission
              }
              onClick={() => acceptAssignment.mutate(assignment.id)}
            >
              {acceptAssignment.isPending ? 'Starting…' : 'Start assignment'}
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
              Opens automatically. If you close this, it shows as ready in your
              assignments list.
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
    </>
  );
};
