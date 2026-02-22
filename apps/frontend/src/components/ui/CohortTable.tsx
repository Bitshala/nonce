import type { ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import StatusBadge from './StatusBadge';

export type CohortRow = {
  id: string;
  name: string;
  type: string;
  season: number;
  status: string;
  startDate: string;
  endDate: string;
  weeks?: number;
  participants?: number;
  applications?: number;
  raw?: unknown;
};

type CohortTableProps = {
  cohorts: CohortRow[];
  onRowClick?: (cohort: CohortRow) => void;
  actions?: (cohort: CohortRow) => ReactNode;
  loading?: boolean;
  emptyMessage?: string;
};

const formatDate = (iso: string): string => {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '-';
  }
};

const headerCellSx = {
  color: '#71717a',
  fontWeight: 600,
  fontSize: '0.75rem',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  borderBottom: '1px solid rgba(63,63,70,0.5)',
  py: 2,
  px: 3,
  whiteSpace: 'nowrap' as const,
};

const bodyCellSx = {
  borderBottom: '1px solid rgba(63,63,70,0.3)',
  py: 2.5,
  px: 3,
};

const CohortTable = ({
  cohorts,
  onRowClick,
  actions,
  loading = false,
  emptyMessage = 'No cohorts found.',
}: CohortTableProps) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, py: 10 }}>
        <CircularProgress size={36} sx={{ color: '#f97316' }} />
        <Typography variant="body2" sx={{ color: '#71717a' }}>Loading cohorts...</Typography>
      </Box>
    );
  }

  if (cohorts.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <Typography variant="body2" sx={{ color: '#71717a' }}>{emptyMessage}</Typography>
      </Box>
    );
  }

  const hasWeeks = cohorts.some((c) => c.weeks !== undefined);
  const hasParticipants = cohorts.some((c) => c.participants !== undefined);
  const hasApplications = cohorts.some((c) => c.applications !== undefined);

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={headerCellSx}>Cohort</TableCell>
            <TableCell sx={headerCellSx}>Season</TableCell>
            <TableCell sx={headerCellSx}>Status</TableCell>
            {hasWeeks && (
              <TableCell sx={{ ...headerCellSx, display: { xs: 'none', sm: 'table-cell' } }}>Weeks</TableCell>
            )}
            {hasParticipants && (
              <TableCell sx={{ ...headerCellSx, display: { xs: 'none', sm: 'table-cell' } }}>Participants</TableCell>
            )}
            {hasApplications && (
              <TableCell sx={{ ...headerCellSx, display: { xs: 'none', sm: 'table-cell' } }}>Applications</TableCell>
            )}
            <TableCell sx={{ ...headerCellSx, display: { xs: 'none', md: 'table-cell' } }}>Start Date</TableCell>
            <TableCell sx={{ ...headerCellSx, display: { xs: 'none', md: 'table-cell' } }}>End Date</TableCell>
            {actions && <TableCell sx={{ ...headerCellSx, textAlign: 'right' }}>Actions</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {cohorts.map((cohort) => (
            <TableRow
              key={cohort.id}
              hover
              onClick={() => onRowClick?.(cohort)}
              sx={{
                cursor: onRowClick ? 'pointer' : 'default',
                '&:hover': { bgcolor: 'rgba(63,63,70,0.3)' },
                transition: 'background-color 150ms',
              }}
            >
              <TableCell sx={bodyCellSx}>
                <Typography variant="body2" sx={{ fontWeight: 500, color: '#fafafa' }}>
                  {cohort.name}
                </Typography>
              </TableCell>
              <TableCell sx={bodyCellSx}>
                <Typography variant="body2" sx={{ color: '#d4d4d8' }}>S{cohort.season}</Typography>
              </TableCell>
              <TableCell sx={bodyCellSx}>
                <StatusBadge status={cohort.status} />
              </TableCell>
              {hasWeeks && (
                <TableCell sx={{ ...bodyCellSx, display: { xs: 'none', sm: 'table-cell' } }}>
                  <Typography variant="body2" sx={{ color: '#d4d4d8' }}>
                    {cohort.weeks !== undefined ? cohort.weeks : '-'}
                  </Typography>
                </TableCell>
              )}
              {hasParticipants && (
                <TableCell sx={{ ...bodyCellSx, display: { xs: 'none', sm: 'table-cell' } }}>
                  <Typography variant="body2" sx={{ color: '#d4d4d8' }}>
                    {cohort.participants !== undefined ? cohort.participants : '-'}
                  </Typography>
                </TableCell>
              )}
              {hasApplications && (
                <TableCell sx={{ ...bodyCellSx, display: { xs: 'none', sm: 'table-cell' } }}>
                  <Typography variant="body2" sx={{ color: '#d4d4d8' }}>
                    {cohort.applications !== undefined ? cohort.applications : '-'}
                  </Typography>
                </TableCell>
              )}
              <TableCell sx={{ ...bodyCellSx, display: { xs: 'none', md: 'table-cell' } }}>
                <Typography variant="body2" sx={{ color: '#a1a1aa' }}>{formatDate(cohort.startDate)}</Typography>
              </TableCell>
              <TableCell sx={{ ...bodyCellSx, display: { xs: 'none', md: 'table-cell' } }}>
                <Typography variant="body2" sx={{ color: '#a1a1aa' }}>{formatDate(cohort.endDate)}</Typography>
              </TableCell>
              {actions && (
                <TableCell sx={{ ...bodyCellSx, textAlign: 'right' }}>
                  <Box
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {actions(cohort)}
                  </Box>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default CohortTable;
