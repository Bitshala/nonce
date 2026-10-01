import { createTheme, type Theme } from '@mui/material/styles';
import { fellowshipDarkTheme } from '../fellowship/theme';

/** Surface colours of the assignment workspace and its side panels. */
export const workspacePalette = {
  bg: '#0b0b0d',
  panel: '#111114',
  card: '#19191d',
  chip: '#222227',
  line: '#2a2a30',
  lineStrong: '#3b3b43',
  muted: '#a3a3ad',
  faint: '#80808a',
  accent: '#f5873a',
  accentHover: '#f79556',
  accentInk: '#1c0f05',
} as const;

export type WorkspacePalette = typeof workspacePalette;

declare module '@mui/material/styles' {
  interface Palette {
    workspace: WorkspacePalette;
  }
  interface PaletteOptions {
    workspace?: WorkspacePalette;
  }
}

/** The fellowship dark theme plus the workspace palette, as `workspace.*` in `sx`. */
export const assignmentTheme = createTheme(fellowshipDarkTheme, {
  palette: { workspace: workspacePalette },
});

/** `sx` value for a 1px border in a workspace colour. */
export const workspaceBorder =
  (key: keyof WorkspacePalette) =>
  (theme: Theme): string =>
    `1px solid ${theme.palette.workspace[key]}`;
