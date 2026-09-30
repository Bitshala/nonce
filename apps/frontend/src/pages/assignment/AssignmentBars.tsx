import { Box, Stack, Tooltip, Typography } from '@mui/material';
import {
  SEGMENTS,
  type Tally,
} from '../../components/assignment/assignmentTally.ts';

export const StackedBar = ({
  tally,
  height = 8,
}: {
  tally: Tally;
  height?: number;
}) => (
  <Box
    role="img"
    aria-label={SEGMENTS.map(
      s => `${tally[s.key]} ${s.label.toLowerCase()}`
    ).join(', ')}
    sx={{
      display: 'flex',
      height,
      borderRadius: 99,
      overflow: 'hidden',
      bgcolor: 'action.hover',
    }}
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
      <Stack
        key={s.key}
        direction="row"
        spacing={0.75}
        sx={{ alignItems: 'center' }}
      >
        <Box
          sx={{ width: 8, height: 8, borderRadius: 0.5, bgcolor: s.color }}
        />
        <Typography variant="caption" color="text.secondary">
          {s.label}
        </Typography>
      </Stack>
    ))}
  </Stack>
);
