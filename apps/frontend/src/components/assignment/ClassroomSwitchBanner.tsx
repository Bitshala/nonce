import { useState, type ReactNode } from 'react';
import { Alert, AlertTitle, IconButton, Stack } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { readStored, writeStored } from '../../utils/storage.ts';
import { formatDate } from '../../utils/dateUtils.ts';

const dismissedKey = (cohortId: string) =>
  `classroom-switch-notice-dismissed:${cohortId}`;

/**
 * Tells a student their cohort's exercises moved off GitHub Classroom. The
 * Classroom repo they have bookmarked keeps accepting pushes, so without this
 * a student could keep working there, see tests pass, and never be graded.
 * Dismissible per cohort; the dismissal is only remembered in this browser,
 * so at worst a student sees it again.
 */
export const ClassroomSwitchBanner = ({
  cohortId,
  cohortName,
  switchedAt,
  action,
}: {
  cohortId: string;
  cohortName: string;
  switchedAt: string;
  action?: ReactNode;
}) => {
  const [dismissed, setDismissed] = useState(
    () => readStored(dismissedKey(cohortId)) !== null
  );
  if (dismissed) return null;

  const dismiss = () => {
    writeStored(dismissedKey(cohortId), switchedAt);
    setDismissed(true);
  };

  return (
    <Alert
      severity="info"
      variant="outlined"
      // A custom action replaces MUI's own close button, so it is drawn here
      // too; otherwise passing an action would make the notice undismissable.
      action={
        <Stack direction="row" sx={{ alignItems: 'center' }}>
          {action}
          <IconButton
            aria-label="Dismiss"
            size="small"
            color="inherit"
            onClick={dismiss}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      }
      sx={{
        mb: 3,
        bgcolor: 'rgba(96,165,250,0.08)',
        color: '#dbeafe',
        borderColor: 'rgba(96,165,250,0.4)',
        '& .MuiAlert-icon': { color: '#60a5fa' },
        '& .MuiAlert-action': { alignItems: 'center', pt: 0 },
      }}
    >
      <AlertTitle sx={{ fontWeight: 600 }}>
        Exercises for {cohortName} have moved to the Bitshala classroom
      </AlertTitle>
      Since {formatDate(switchedAt)}, work pushed to GitHub Classroom isn't
      graded. Your earlier GitHub Classroom results are kept and still count,
      and nothing you do here can lower them.
    </Alert>
  );
};
