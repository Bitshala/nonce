import type { ReactNode } from 'react';
import { CssBaseline, ThemeProvider, type Theme } from '@mui/material';
import { fellowshipDarkTheme } from './theme';

/**
 * The one place the fellowship dark theme is provided. `baseline` also resets
 * the page for screens that own the whole viewport.
 */
export const FellowshipTheme = ({
  children,
  baseline = false,
  theme = fellowshipDarkTheme,
}: {
  children: ReactNode;
  baseline?: boolean;
  theme?: Theme;
}) => (
  <ThemeProvider theme={theme}>
    {baseline && <CssBaseline />}
    {children}
  </ThemeProvider>
);
