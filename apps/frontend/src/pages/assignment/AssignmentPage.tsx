import { useParams } from 'react-router-dom';
import { Alert, CircularProgress, Paper, Stack } from '@mui/material';
import { AssignmentBriefBody } from '../../components/assignment/AssignmentBriefBody.tsx';
import { AssignmentScreen } from '../../components/assignment/AssignmentTheme.tsx';
import {
  provisionRefetchInterval,
  useOpenEditorWhenReady,
} from '../../components/assignment/provision.ts';
import { useAssignment } from '../../hooks/assignmentHooks.ts';
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

  usePageMeta(
    assignment?.title ? `${assignment.title} — Exercise` : 'Exercise'
  );

  useOpenEditorWhenReady(
    assignmentId,
    assignment?.submission?.provisionStatus,
    {
      replace: true,
    }
  );

  if (isLoading || isError || !assignment) {
    return (
      <AssignmentScreen center>
        {isLoading ? (
          <CircularProgress aria-label="Loading assignment" />
        ) : (
          <Alert severity="error">{extractErrorMessage(error)}</Alert>
        )}
      </AssignmentScreen>
    );
  }

  return (
    <AssignmentScreen narrow>
      <Paper
        variant="outlined"
        sx={{ width: '100%', maxWidth: 560, p: 3.5, alignSelf: 'flex-start' }}
      >
        <Stack spacing={2.5}>
          <AssignmentBriefBody assignment={assignment} />
        </Stack>
      </Paper>
    </AssignmentScreen>
  );
};

export default AssignmentPage;
