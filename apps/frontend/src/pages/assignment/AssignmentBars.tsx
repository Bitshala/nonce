import { Box, Stack, Tooltip, Typography } from '@mui/material';
import type { AdminAssignmentResponse } from '@nonce/shared';

export type Tally = Pick<
  AdminAssignmentResponse,
  'passedCount' | 'failingCount' | 'inProgressCount' | 'failedProvisionCount' | 'notStartedCount'
>;

export const SEGMENTS: { key: keyof Tally; label: string; color: string }[] = [
  { key: 'passedCount', label: 'Passed', color: 'success.main' },
  { key: 'failingCount', label: 'Failing', color: 'error.main' },
  { key: 'failedProvisionCount', label: 'Setup failed', color: 'warning.main' },
  { key: 'inProgressCount', label: 'In progress', color: 'info.main' },
  { key: 'notStartedCount', label: 'Not started', color: 'action.disabled' },
];

export const sumTallies = (rows: Tally[]): Tally => ({
  passedCount: rows.reduce((n, r) => n + r.passedCount, 0),
  failingCount: rows.reduce((n, r) => n + r.failingCount, 0),
  inProgressCount: rows.reduce((n, r) => n + r.inProgressCount, 0),
  failedProvisionCount: rows.reduce((n, r) => n + r.failedProvisionCount, 0),
  notStartedCount: rows.reduce((n, r) => n + r.notStartedCount, 0),
});

export const StackedBar = ({ tally, height = 8 }: { tally: Tally; height?: number }) => (
  <Box
    role="img"
    aria-label={SEGMENTS.map(s => `${tally[s.key]} ${s.label.toLowerCase()}`).join(', ')}
    sx={{ display: 'flex', height, borderRadius: 99, overflow: 'hidden', bgcolor: 'action.hover' }}
  >
    {SEGMENTS.map(s =>
      tally[s.key] > 0 ? (
        <Tooltip key={s.key} title={`${s.label}: ${tally[s.key]}`}>
          <Box sx={{ flex: tally[s.key], bgcolor: s.color }} />
        </Tooltip>
      ) : null
    )}
  </Box>
);

export const Legend = () => (
  <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: '4px 16px' }}>
    {SEGMENTS.map(s => (
      <Stack key={s.key} direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
        <Box sx={{ width: 8, height: 8, borderRadius: 0.5, bgcolor: s.color }} />
        <Typography variant="caption" color="text.secondary">
          {s.label}
        </Typography>
      </Stack>
    ))}
  </Stack>
);
