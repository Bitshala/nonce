import type { ReactNode } from 'react';
import { useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { FellowshipPageLayout } from '../../../components/fellowship/FellowshipPageLayout';
import fellowshipService from '../../../services/fellowshipService';
import {
  FellowshipKind,
  FellowshipStatus,
  FellowshipType,
} from '../../../types/fellowship';
import {
  formatFellowshipKind,
  formatFellowshipType,
} from '../../../utils/fellowshipFormat';
import {
  buildFellowshipOverview,
  type ReportPeriod,
} from '../../../utils/fellowshipOverview';
import { extractErrorMessage } from '../../../utils/errorUtils';

// Admin-only aggregate view of the fellowship program (#26). Everything is
// derived client-side from the same list endpoints the admin tables use; the
// rules live in utils/fellowshipOverview.ts.

const STATUS_LABELS: Record<FellowshipStatus, string> = {
  [FellowshipStatus.PENDING]: 'Pending',
  [FellowshipStatus.AWAITING_DOCUMENTS]: 'Awaiting docs',
  [FellowshipStatus.DOCUMENTS_IN_REVIEW]: 'Docs in review',
  [FellowshipStatus.DOCUMENTS_APPROVED]: 'Docs approved',
  [FellowshipStatus.ACTIVE]: 'Active',
  [FellowshipStatus.COMPLETED]: 'Completed',
};

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});
const monthYear = ({ year, month }: ReportPeriod) =>
  new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

const cardSx = {
  bgcolor: '#18181b',
  border: '1px solid #27272a',
  borderRadius: 2,
  p: 2.5,
};
const sectionTitleSx = {
  fontWeight: 600,
  color: '#fafafa',
  fontSize: '1rem',
  mb: 2,
};
const mutedSx = { color: '#71717a', fontSize: '0.8rem' };

const StatTile = ({
  label,
  value,
  hint,
  accent = '#fafafa',
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: string;
}) => (
  <Box sx={cardSx}>
    <Typography
      sx={{
        ...mutedSx,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        fontWeight: 600,
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{ color: accent, fontWeight: 700, fontSize: '1.75rem', mt: 0.5 }}
    >
      {value}
    </Typography>
    {hint && <Typography sx={{ ...mutedSx, mt: 0.5 }}>{hint}</Typography>}
  </Box>
);

// One labelled count per row with a proportional bar, so the breakdowns read
// at a glance without a chart library.
const CountList = ({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; count: number }[];
}) => {
  const max = Math.max(1, ...rows.map(r => r.count));
  return (
    <Box sx={cardSx}>
      <Typography sx={sectionTitleSx}>{title}</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {rows.map(row => (
          <Box key={row.label}>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}
            >
              <Typography sx={{ color: '#d4d4d8', fontSize: '0.85rem' }}>
                {row.label}
              </Typography>
              <Typography
                sx={{ color: '#fafafa', fontSize: '0.85rem', fontWeight: 600 }}
              >
                {row.count}
              </Typography>
            </Box>
            <Box sx={{ height: 6, bgcolor: '#27272a', borderRadius: 3 }}>
              <Box
                sx={{
                  height: 6,
                  width: `${(row.count / max) * 100}%`,
                  bgcolor: '#fb923c',
                  borderRadius: 3,
                }}
              />
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

const FellowshipOverviewAdmin = () => {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['fellowship-overview'],
    queryFn: async () => {
      const [fellowships, applications, reports] = await Promise.all([
        fellowshipService.fetchAllFellowships({}),
        fellowshipService.fetchAllApplications({}),
        fellowshipService.fetchAllReports({}),
      ]);
      return { fellowships, applications, reports };
    },
  });

  const overview = useMemo(
    () =>
      data
        ? buildFellowshipOverview(
            data.fellowships,
            data.applications,
            data.reports
          )
        : null,
    [data]
  );

  return (
    <FellowshipPageLayout
      title="Overview"
      subtitle="Aggregate view of fellowships, applications, payouts and reporting."
      badge="Admin"
      hideIcon
    >
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress sx={{ color: '#fb923c' }} />
        </Box>
      )}

      {isError && (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              Retry
            </Button>
          }
        >
          Couldn't load the overview: {extractErrorMessage(error)}
        </Alert>
      )}

      {overview && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: '1fr 1fr',
                lg: 'repeat(4, 1fr)',
              },
              gap: 2,
            }}
          >
            <StatTile
              label="Active fellowships"
              value={overview.fellowships.byStatus[FellowshipStatus.ACTIVE]}
              hint={`${overview.fellowships.total} fellowships in total`}
            />
            <StatTile
              label="Paid out"
              value={usd.format(overview.payouts.paidUsd)}
              hint={`${overview.payouts.paidReports} approved monthly report${overview.payouts.paidReports === 1 ? '' : 's'}`}
              accent="#4ade80"
            />
            <StatTile
              label="Pending payout"
              value={usd.format(overview.payouts.pendingUsd)}
              hint={`${overview.payouts.pendingReports} report${overview.payouts.pendingReports === 1 ? '' : 's'} awaiting review`}
              accent="#fbbf24"
            />
            <StatTile
              label="Overdue reports"
              value={overview.compliance.overdueReports}
              hint={`across ${overview.compliance.overdueFellowships.length} fellowship${overview.compliance.overdueFellowships.length === 1 ? '' : 's'}`}
              accent={
                overview.compliance.overdueReports > 0 ? '#f87171' : '#fafafa'
              }
            />
          </Box>
          <Typography sx={{ ...mutedSx, mt: -1.5 }}>
            Payouts are derived from report approval: each approved monthly
            report counts as one paid month at the fellowship's monthly amount,
            each submitted one as pending. Actual payments are not recorded in
            the app.
            {overview.payouts.reportsWithoutAmount > 0 &&
              ` ${overview.payouts.reportsWithoutAmount} report(s) belong to fellowships with no monthly amount and add nothing.`}
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
              gap: 2,
            }}
          >
            <CountList
              title="By status"
              rows={Object.values(FellowshipStatus).map(s => ({
                label: STATUS_LABELS[s],
                count: overview.fellowships.byStatus[s],
              }))}
            />
            <CountList
              title="By track"
              rows={Object.values(FellowshipType).map(t => ({
                label: formatFellowshipType(t),
                count: overview.fellowships.byType[t],
              }))}
            />
            <CountList
              title="By kind"
              rows={Object.values(FellowshipKind).map(k => ({
                label: formatFellowshipKind(k),
                count: overview.fellowships.byKind[k],
              }))}
            />
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' },
              gap: 2,
            }}
          >
            <Box>
              <CountList
                title="Application funnel"
                rows={[
                  { label: 'Submitted', count: overview.funnel.submitted },
                  { label: 'In review', count: overview.funnel.inReview },
                  {
                    label: 'Changes requested',
                    count: overview.funnel.changesRequested,
                  },
                  { label: 'Accepted', count: overview.funnel.accepted },
                  { label: 'Rejected', count: overview.funnel.rejected },
                ]}
              />
              <Typography sx={{ ...mutedSx, mt: 1 }}>
                Acceptance rate:{' '}
                {overview.funnel.acceptanceRate === null
                  ? 'no decisions yet'
                  : `${Math.round(overview.funnel.acceptanceRate * 100)}% of decided applications`}
                . Drafts are not counted.
              </Typography>
            </Box>

            <Box sx={cardSx}>
              <Typography sx={sectionTitleSx}>Reporting compliance</Typography>
              <Typography sx={{ ...mutedSx, mb: 2 }}>
                Fellowships missing a report for a month that has ended and that
                their contract covered (rejected reports count as missing).{' '}
                {overview.compliance.awaitingReview} submitted report
                {overview.compliance.awaitingReview === 1
                  ? ' is'
                  : 's are'}{' '}
                awaiting review.
              </Typography>
              {overview.compliance.overdueFellowships.length === 0 ? (
                <Typography sx={{ color: '#4ade80', fontSize: '0.9rem' }}>
                  Every fellowship is up to date.
                </Typography>
              ) : (
                <Box
                  sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}
                >
                  {overview.compliance.overdueFellowships.map(f => (
                    <Box
                      key={f.fellowshipId}
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 1,
                        borderTop: '1px solid #27272a',
                        pt: 1.5,
                      }}
                    >
                      <Box sx={{ minWidth: 180, flex: '1 1 180px' }}>
                        <Typography
                          sx={{
                            color: '#fafafa',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                          }}
                        >
                          {f.fellowName}
                        </Typography>
                        <Typography sx={mutedSx}>
                          {f.project ?? 'No project name'} ·{' '}
                          {STATUS_LABELS[f.status]}
                        </Typography>
                      </Box>
                      <Box
                        sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}
                      >
                        {f.missing.map(p => (
                          <Chip
                            key={`${p.year}-${p.month}`}
                            label={monthYear(p)}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(248,113,113,0.12)',
                              color: '#f87171',
                              border: '1px solid rgba(248,113,113,0.3)',
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      )}
    </FellowshipPageLayout>
  );
};

export default FellowshipOverviewAdmin;
