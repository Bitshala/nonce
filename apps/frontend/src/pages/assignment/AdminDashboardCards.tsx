import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { WIDE } from '../../components/assignment/layout.ts';

export const StatCard = ({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color?: string;
}) => (
  <Paper variant="outlined" sx={{ p: 2.5 }}>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="h4" sx={{ fontWeight: 700, my: 0.5, color }}>
      {value}
    </Typography>
    <Typography variant="body2" color="text.secondary">
      {sub}
    </Typography>
  </Paper>
);

export const AttentionItem = ({
  dot,
  text,
  sub,
  action,
  onAction,
  hideWide,
}: {
  dot: string;
  text: string;
  sub?: string;
  action?: string;
  onAction: () => void;
  /** Config warnings live inside the Course config card when there is room for it. */
  hideWide?: boolean;
}) => (
  <Stack
    direction="row"
    spacing={1.5}
    sx={{
      alignItems: 'center',
      bgcolor: 'action.hover',
      borderRadius: 1,
      px: 1.5,
      py: 1.25,
      ...(hideWide && { [WIDE]: { display: 'none' } }),
    }}
  >
    <Box
      sx={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        bgcolor: dot,
        flexShrink: 0,
      }}
    />
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {text}
      </Typography>
      {sub && (
        <Typography variant="caption" color="text.secondary">
          {sub}
        </Typography>
      )}
    </Box>
    {action && (
      <Button
        size="small"
        variant="outlined"
        sx={{ flexShrink: 0 }}
        onClick={onAction}
      >
        {action}
      </Button>
    )}
  </Stack>
);
