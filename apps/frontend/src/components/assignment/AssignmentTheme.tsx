import { Box } from '@mui/material';
import { FellowshipTheme } from '../fellowship/FellowshipTheme';
import { assignmentTheme } from './workspaceTheme';

/**
 * The dark Material UI theme every assignment screen renders in. The editor
 * sits outside the app Layout and owns the whole viewport, so it also resets
 * the page baseline; the other screens live inside the Layout and must not.
 */
export const AssignmentTheme = ({
  children,
  baseline = false,
}: {
  children: React.ReactNode;
  baseline?: boolean;
}) => (
  <FellowshipTheme theme={assignmentTheme} baseline={baseline}>
    {children}
  </FellowshipTheme>
);

/**
 * A full-height page in the assignment theme. `narrow` lays the content out as
 * a centred column (single-assignment views); `center` also centres it
 * vertically (loading and error states).
 */
export const AssignmentScreen = ({
  children,
  narrow = false,
  center = false,
}: {
  children: React.ReactNode;
  narrow?: boolean;
  center?: boolean;
}) => (
  <AssignmentTheme>
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        color: 'text.primary',
        ...(narrow || center
          ? {
              display: 'flex',
              justifyContent: 'center',
              alignItems: center ? 'center' : 'flex-start',
              p: { xs: 2, md: 6 },
            }
          : { p: { xs: 2, md: 5 } }),
      }}
    >
      {children}
    </Box>
  </AssignmentTheme>
);
