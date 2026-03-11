import { Box, Typography, Divider } from '@mui/material';
import { getMaxScores } from '../../utils/calculations';

interface StudentSummaryProps {
  stats: {
    totalScore: number;
    avgScore: number;
    attendanceRate: number;
    overallPercentage: number;
    attendedWeeks: number;
    maxPossibleScore: number;
    totalWeeks: number;
  };
  hasExercises?: boolean;
}

const getColor = (pct: number): string => {
  if (pct >= 80) return '#4ade80';
  if (pct >= 60) return '#facc15';
  if (pct >= 40) return '#fb923c';
  return '#f87171';
};

export const StudentSummary = ({ stats, hasExercises = true }: StudentSummaryProps) => {
  const maxScores = getMaxScores(hasExercises);

  const items = [
    { label: 'Score', value: `${Math.round(stats.totalScore)}/${stats.maxPossibleScore}`, color: '#fff' },
    { label: 'Avg/Week', value: `${Math.round(stats.avgScore)}/${maxScores.total}`, color: '#fff' },
    { label: 'Attendance', value: `${Math.round(stats.attendanceRate)}%`, sub: `${stats.attendedWeeks}/${stats.totalWeeks}`, color: getColor(stats.attendanceRate) },
    { label: 'Overall', value: `${Math.round(stats.overallPercentage)}%`, color: getColor(stats.overallPercentage) },
    { label: 'Weeks', value: `${stats.attendedWeeks}`, color: '#fff' },
  ];

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 1.5, sm: 2 },
        mb: 4,
        py: 1.5,
        borderTop: '1px solid #3f3f46',
        borderBottom: '1px solid #3f3f46',
        overflowX: 'auto',
        flexWrap: { xs: 'wrap', sm: 'nowrap' },
      }}
    >
      {items.map((item, i) => (
        <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 } }}>
          {i > 0 && (
            <Divider orientation="vertical" flexItem sx={{ borderColor: '#3f3f46', display: { xs: 'none', sm: 'block' } }} />
          )}
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, whiteSpace: 'nowrap' }}>
            <Typography variant="body2" sx={{ color: '#a1a1aa', fontSize: '0.8rem', fontWeight: 500 }}>
              {item.label}
            </Typography>
            <Typography sx={{ color: item.color, fontWeight: 700, fontSize: '1rem' }}>
              {item.value}
            </Typography>
            {item.sub && (
              <Typography variant="caption" sx={{ color: '#71717a' }}>
                ({item.sub})
              </Typography>
            )}
          </Box>
        </Box>
      ))}
    </Box>
  );
};
