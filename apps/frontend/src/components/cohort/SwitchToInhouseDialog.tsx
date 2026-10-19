import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import type { SwitchToInhouseResponse } from '@nonce/shared';
import {
  useSwitchCohortToInhouse,
  useSwitchToInhousePreview,
} from '../../hooks/assignmentHooks';
import { formatDate, formatDateTime } from '../../utils/dateUtils';
import { extractErrorMessage } from '../../utils/errorUtils';

const textSx = { color: '#d4d4d8', fontSize: '0.875rem' };
const cellSx = { color: '#d4d4d8', borderColor: '#3f3f46', py: 0.75, px: 1.5 };
const headCellSx = { ...cellSx, color: '#a1a1aa', fontWeight: 600 };

const inputSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#18181b',
    color: '#fafafa',
    '& fieldset': { borderColor: '#52525b' },
    '&:hover fieldset': { borderColor: '#ef4444' },
    '&.Mui-focused fieldset': { borderColor: '#ef4444' },
  },
  '& .MuiInputLabel-root': { color: '#d4d4d8' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#ef4444' },
};

/**
 * Confirms the one-way switch of a cohort from GitHub Classroom to the
 * in-house classroom. It loads the switch's dry-run first, so the admin sees
 * who and what it touches, and can only confirm a switch that will succeed.
 * Typing the cohort's name is the brake on an action that changes how
 * hundreds of scores are derived and cannot be undone.
 */
export const SwitchToInhouseDialog = ({
  cohortId,
  name,
  season,
  onClose,
  onSwitched,
}: {
  cohortId: string;
  name: string;
  season: number;
  onClose: () => void;
  onSwitched: (result: SwitchToInhouseResponse) => void;
}) => {
  // Always fresh: student counts and blockers can change between openings.
  const preview = useSwitchToInhousePreview(cohortId, {
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
  const switchToInhouse = useSwitchCohortToInhouse();
  const [typed, setTyped] = useState('');

  const expected = `${name} S${season}`;
  const isPending = switchToInhouse.isPending;
  const canConfirm =
    preview.data?.canSwitch === true && typed.trim() === expected && !isPending;

  const confirm = () => {
    // A failure keeps the dialog open with its reason inline, so the admin
    // does not lose the context they were deciding in.
    switchToInhouse.mutate(cohortId, { onSuccess: onSwitched });
  };

  return (
    <Dialog
      open
      onClose={() => {
        if (!isPending) onClose();
      }}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#1c1c1e',
          backgroundImage: 'none',
          borderRadius: 3,
          border: '1px solid #3f3f46',
        },
      }}
    >
      <DialogTitle sx={{ color: '#fafafa', fontWeight: 700 }}>
        Switch {expected} to the in-house classroom
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {preview.isLoading && (
          <Box aria-label="Loading switch preview">
            <Skeleton sx={{ bgcolor: '#27272a' }} />
            <Skeleton sx={{ bgcolor: '#27272a' }} />
            <Skeleton sx={{ bgcolor: '#27272a' }} width="60%" />
          </Box>
        )}

        {preview.isError && (
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => preview.refetch()}
              >
                Retry
              </Button>
            }
          >
            Couldn't check whether this cohort can switch:{' '}
            {extractErrorMessage(preview.error)}
          </Alert>
        )}

        {preview.data && preview.data.blockers.length > 0 && (
          <Alert severity="error">
            <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', mb: 0.5 }}>
              This cohort can't be switched yet:
            </Typography>
            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
              {preview.data.blockers.map(blocker => (
                <li key={blocker.code}>{blocker.message}</li>
              ))}
            </ul>
          </Alert>
        )}

        {preview.data?.canSwitch && (
          <>
            <Typography
              component="ul"
              variant="body2"
              sx={{ ...textSx, m: 0, pl: '1.2rem', '& li': { mb: 0.75 } }}
            >
              <li>
                {preview.data.studentCount === 0 ? (
                  <>
                    No students are enrolled yet. Anyone who joins later starts
                    on the in-house classroom.
                  </>
                ) : (
                  <>
                    <strong>{preview.data.studentCount}</strong> student
                    {preview.data.studentCount === 1 ? '' : 's'} move to the
                    in-house classroom
                    {preview.data.currentWeek !== null &&
                      `, in week ${preview.data.currentWeek}`}
                    . Each gets an email, and a notice on their Assignments
                    page.
                  </>
                )}
              </li>
              <li>
                GitHub Classroom is read one last time, then every student's
                Classroom results are frozen and kept. In-house work can raise
                them, never lower them. Last periodic sync:{' '}
                {preview.data.lastClassroomSyncAt
                  ? formatDateTime(preview.data.lastClassroomSyncAt)
                  : 'none in the last 30 days'}
                .
              </li>
              <li>
                Classroom sync stops. Anything pushed to GitHub Classroom after
                this is not graded.
              </li>
              <li>These assignments open now, past weeks included:</li>
            </Typography>

            <Table size="small" aria-label="Assignments the switch opens">
              <TableHead>
                <TableRow>
                  <TableCell sx={headCellSx}>Week</TableCell>
                  <TableCell sx={headCellSx}>Exercise</TableCell>
                  <TableCell sx={headCellSx}>Due</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {preview.data.weeksToSeed.map(week => (
                  <TableRow key={week.week}>
                    <TableCell sx={cellSx}>{week.week}</TableCell>
                    <TableCell sx={cellSx}>{week.title ?? '—'}</TableCell>
                    <TableCell sx={cellSx}>
                      {week.deadline
                        ? formatDate(week.deadline)
                        : 'No deadline'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Alert
              severity="warning"
              variant="outlined"
              sx={{
                color: '#fde68a',
                borderColor: 'rgba(251,191,36,0.4)',
                bgcolor: 'rgba(251,191,36,0.06)',
                '& .MuiAlert-icon': { color: '#fbbf24' },
              }}
            >
              <strong>This cannot be undone.</strong> The cohort cannot go back
              to GitHub Classroom.
            </Alert>

            {/* The phrase sits outside the field, in full, rather than in its
                label: a long cohort name would be cut off there, and the label
                moves away once typing starts. */}
            <Box>
              <Typography sx={{ ...textSx, mb: 1 }}>
                Type{' '}
                <Box
                  component="code"
                  sx={{
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 1,
                    bgcolor: '#27272a',
                    border: '1px solid #3f3f46',
                    color: '#fafafa',
                    fontSize: '0.8rem',
                  }}
                >
                  {expected}
                </Box>{' '}
                to confirm.
              </Typography>
              <TextField
                fullWidth
                value={typed}
                onChange={e => setTyped(e.target.value)}
                disabled={isPending}
                autoComplete="off"
                size="small"
                placeholder={expected}
                slotProps={{
                  htmlInput: { 'aria-label': `Type ${expected} to confirm` },
                }}
                sx={inputSx}
              />
            </Box>
          </>
        )}

        {switchToInhouse.isError && (
          <Alert severity="error">
            The switch did not happen:{' '}
            {extractErrorMessage(switchToInhouse.error)}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          disabled={isPending}
          sx={{ color: '#d4d4d8', textTransform: 'none' }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={confirm}
          disabled={!canConfirm}
          sx={{
            textTransform: 'none',
            boxShadow: 'none',
            minWidth: 160,
            // MUI's default disabled grey is near-invisible on this dialog.
            '&.Mui-disabled': {
              bgcolor: 'rgba(239,68,68,0.15)',
              color: 'rgba(252,165,165,0.6)',
            },
          }}
        >
          {isPending ? (
            <CircularProgress size={20} sx={{ color: '#fff' }} />
          ) : (
            'Switch permanently'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
