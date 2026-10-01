import { useEffect } from 'react';
import { CircularProgress, Drawer, IconButton, Stack } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { AssignmentBriefBody } from '../../components/assignment/AssignmentBriefBody.tsx';
import {
  provisionRefetchInterval,
  useOpenEditorWhenReady,
} from '../../components/assignment/provision.ts';
import { useAssignment } from '../../hooks/assignmentHooks.ts';

/** The assignment brief as a side drawer, opened from the assignments list. */
export const AssignmentBriefDrawer = ({
  assignmentId,
  onClose,
}: {
  assignmentId: string;
  onClose: () => void;
}) => {
  const { data: assignment, isLoading } = useAssignment(assignmentId, {
    refetchInterval: provisionRefetchInterval,
  });
  useOpenEditorWhenReady(assignmentId, assignment?.submission?.provisionStatus);

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
          <AssignmentBriefBody assignment={assignment} />
        )}
      </Stack>
    </Drawer>
  );
};
