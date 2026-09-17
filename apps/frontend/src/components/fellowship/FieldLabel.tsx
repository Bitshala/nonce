import { Typography } from '@mui/material';

/**
 * The small uppercase caption above a form field. Shared by the application
 * form and by MarkdownField, which renders its own label row so it can sit the
 * Write/Preview toggle beside it.
 */
export const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <Typography
    variant="caption"
    sx={{
      color: 'text.secondary',
      letterSpacing: 1.2,
      fontWeight: 600,
      display: 'block',
      mb: 0.75,
      textTransform: 'uppercase',
    }}
  >
    {children}
  </Typography>
);

export default FieldLabel;
