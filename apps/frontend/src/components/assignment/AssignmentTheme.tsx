import { CssBaseline, ThemeProvider } from '@mui/material';
import { fellowshipDarkTheme } from '../fellowship/theme';

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
  <ThemeProvider theme={fellowshipDarkTheme}>
    {baseline && <CssBaseline />}
    {children}
  </ThemeProvider>
);
