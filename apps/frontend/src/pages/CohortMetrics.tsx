import { useState, useMemo } from 'react';
import { Box, Typography, CircularProgress, Chip } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  ComposedChart,
  Line,
  Legend,
} from 'recharts';
import { BarChart3, Users, TrendingUp, Target } from 'lucide-react';
import { useQueries } from '@tanstack/react-query';
import { useCohorts } from '../hooks/cohortHooks';
import apiService from '../services/apiService';
import { computeStatus } from '../utils/cohortUtils';
import { cohortTypeToName } from '../helpers/cohortHelpers';
import type { LeaderboardEntryDto, GetCohortLeaderboardResponseDto } from '../types/api';
import type { CohortType } from '../types/enums';

const normalizeLeaderboard = (data: GetCohortLeaderboardResponseDto): LeaderboardEntryDto[] => {
  return Array.isArray(data) ? data : data.leaderboard;
};

const CHART_COLORS = [
  '#fb923c', '#38bdf8', '#4ade80', '#a78bfa',
  '#f472b6', '#facc15', '#34d399', '#f87171',
];

const tooltipStyle = {
  backgroundColor: '#18181b',
  border: '1px solid #3f3f46',
  borderRadius: 8,
  color: '#fafafa',
  fontSize: 13,
};

interface CohortMetric {
  cohortId: string;
  label: string;
  shortLabel: string;
  type: CohortType;
  season: number;
  totalParticipants: number;
  retainedStudents: number;
  retentionRate: number;
  avgAttendanceRate: number;
  completionRate: number;
}

const StatCard = ({
  icon: Icon,
  label,
  value,
  subtitle,
  color,
}: {
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
  value: string | number;
  subtitle?: string;
  color: string;
}) => (
  <Box
    sx={{
      bgcolor: '#1c1c1f',
      border: '1px solid #27272a',
      borderRadius: 2,
      p: 2.5,
      flex: '1 1 200px',
      minWidth: 180,
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
      <Icon size={18} color={color} />
      <Typography sx={{ color: '#a1a1aa', fontSize: '0.8rem', fontWeight: 500 }}>
        {label}
      </Typography>
    </Box>
    <Typography
      sx={{ color: '#fafafa', fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.2 }}
    >
      {value}
    </Typography>
    {subtitle && (
      <Typography sx={{ color: '#71717a', fontSize: '0.75rem', mt: 0.5 }}>
        {subtitle}
      </Typography>
    )}
  </Box>
);

const CohortMetrics = () => {
  const [selectedCohorts, setSelectedCohorts] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<'Completed' | 'Active' | 'All'>(
    'Completed',
  );

  const { data: cohortsData, isLoading: cohortsLoading } = useCohorts({
    page: 0,
    pageSize: 100,
  });

  const filteredCohorts = useMemo(() => {
    if (!cohortsData) return [];
    return cohortsData.records.filter((c) => {
      const status = computeStatus(c.startDate, c.endDate);
      if (statusFilter === 'All') return status !== 'Upcoming';
      return status === statusFilter;
    });
  }, [cohortsData, statusFilter]);

  const leaderboardQueries = useQueries({
    queries: filteredCohorts.map((cohort) => ({
      queryKey: ['scores', 'cohort', cohort.id, 'leaderboard'],
      queryFn: () => apiService.getCohortLeaderboard(cohort.id),
    })),
  });

  const allLoaded = leaderboardQueries.every((q) => !q.isLoading);
  const anyLoading = leaderboardQueries.some((q) => q.isLoading);

  const metricsData: CohortMetric[] = useMemo(() => {
    return filteredCohorts
      .map((cohort, i) => {
        const leaderboard = leaderboardQueries[i]?.data;
        if (!leaderboard) return null;

        const entries = normalizeLeaderboard(leaderboard);
        const totalParticipants = entries.length;

        if (totalParticipants === 0) {
          return {
            cohortId: cohort.id,
            label: `${cohortTypeToName(cohort.type)} S${cohort.season}`,
            shortLabel: `${cohort.type
              .split('_')
              .map((w) => w[0])
              .join('')} S${cohort.season}`,
            type: cohort.type,
            season: cohort.season,
            totalParticipants: 0,
            retainedStudents: 0,
            retentionRate: 0,
            avgAttendanceRate: 0,
            completionRate: 0,
          };
        }

        const retainedStudents = entries.filter(
          (e) => e.maxAttendance > 0 && e.totalAttendance / e.maxAttendance >= 0.5,
        ).length;

        const retentionRate = (retainedStudents / totalParticipants) * 100;

        const avgAttendanceRate =
          (entries.reduce(
            (sum, e) =>
              sum + (e.maxAttendance > 0 ? e.totalAttendance / e.maxAttendance : 0),
            0,
          ) /
            totalParticipants) *
          100;

        const completionRate =
          (entries.reduce(
            (sum, e) =>
              sum + (e.maxTotalScore > 0 ? e.totalScore / e.maxTotalScore : 0),
            0,
          ) /
            totalParticipants) *
          100;

        return {
          cohortId: cohort.id,
          label: `${cohortTypeToName(cohort.type)} S${cohort.season}`,
          shortLabel: `${cohort.type
            .split('_')
            .map((w) => w[0])
            .join('')} S${cohort.season}`,
          type: cohort.type,
          season: cohort.season,
          totalParticipants,
          retainedStudents,
          retentionRate: Math.round(retentionRate * 10) / 10,
          avgAttendanceRate: Math.round(avgAttendanceRate * 10) / 10,
          completionRate: Math.round(completionRate * 10) / 10,
        };
      })
      .filter((m): m is CohortMetric => m !== null);
  }, [filteredCohorts, leaderboardQueries]);

  const displayData = useMemo(() => {
    if (selectedCohorts.size === 0) return metricsData;
    return metricsData.filter((m) => selectedCohorts.has(m.cohortId));
  }, [metricsData, selectedCohorts]);

  const toggleCohort = (cohortId: string) => {
    setSelectedCohorts((prev) => {
      const next = new Set(prev);
      if (next.has(cohortId)) next.delete(cohortId);
      else next.add(cohortId);
      return next;
    });
  };

  const avgRetention =
    displayData.length > 0
      ? Math.round(
          (displayData.reduce((s, d) => s + d.retentionRate, 0) / displayData.length) *
            10,
        ) / 10
      : 0;
  const avgCompletion =
    displayData.length > 0
      ? Math.round(
          (displayData.reduce((s, d) => s + d.completionRate, 0) / displayData.length) *
            10,
        ) / 10
      : 0;
  const totalParticipants = displayData.reduce((s, d) => s + d.totalParticipants, 0);

  if (cohortsLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <CircularProgress sx={{ color: '#fb923c' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <BarChart3 size={28} color="#fb923c" />
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: '#fafafa',
              fontSize: { xs: '1.5rem', md: '2rem' },
            }}
          >
            Cohort Metrics
          </Typography>
        </Box>
        <Typography sx={{ color: '#71717a', fontSize: '0.9rem' }}>
          Continuous analysis of retention data across cohorts and seasons
        </Typography>
      </Box>

      {/* Status Filter */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        {(['Completed', 'Active', 'All'] as const).map((status) => (
          <Chip
            key={status}
            label={status}
            onClick={() => {
              setStatusFilter(status);
              setSelectedCohorts(new Set());
            }}
            sx={{
              bgcolor:
                statusFilter === status ? 'rgba(249,115,22,0.15)' : '#27272a',
              color: statusFilter === status ? '#fb923c' : '#a1a1aa',
              border:
                statusFilter === status
                  ? '1px solid #f97316'
                  : '1px solid #3f3f46',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
              '&:hover': {
                bgcolor:
                  statusFilter === status
                    ? 'rgba(249,115,22,0.2)'
                    : '#3f3f46',
              },
            }}
          />
        ))}
      </Box>

      {/* Cohort Selector Buttons */}
      {metricsData.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography
            sx={{ color: '#a1a1aa', fontSize: '0.8rem', fontWeight: 500, mb: 1 }}
          >
            Filter by cohort (click to toggle, none selected = show all)
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            {metricsData.map((m, i) => (
              <Chip
                key={m.cohortId}
                label={m.shortLabel}
                onClick={() => toggleCohort(m.cohortId)}
                size="small"
                sx={{
                  bgcolor: selectedCohorts.has(m.cohortId)
                    ? `${CHART_COLORS[i % CHART_COLORS.length]}22`
                    : '#1c1c1f',
                  color: selectedCohorts.has(m.cohortId)
                    ? CHART_COLORS[i % CHART_COLORS.length]
                    : '#a1a1aa',
                  border: `1px solid ${selectedCohorts.has(m.cohortId) ? CHART_COLORS[i % CHART_COLORS.length] : '#3f3f46'}`,
                  fontWeight: 500,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: `${CHART_COLORS[i % CHART_COLORS.length]}15`,
                  },
                }}
              />
            ))}
          </Box>
        </Box>
      )}

      {anyLoading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <CircularProgress size={16} sx={{ color: '#fb923c' }} />
          <Typography sx={{ color: '#71717a', fontSize: '0.8rem' }}>
            Loading cohort data...
          </Typography>
        </Box>
      )}

      {/* Summary Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
        <StatCard
          icon={BarChart3}
          label="Cohorts Analyzed"
          value={displayData.length}
          color="#fb923c"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Retention Rate"
          value={`${avgRetention}%`}
          subtitle="Students attending >=50% weeks"
          color="#4ade80"
        />
        <StatCard
          icon={Target}
          label="Avg Completion Rate"
          value={`${avgCompletion}%`}
          subtitle="Average score percentage"
          color="#38bdf8"
        />
        <StatCard
          icon={Users}
          label="Total Participants"
          value={totalParticipants}
          color="#a78bfa"
        />
      </Box>

      {displayData.length === 0 && allLoaded && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography sx={{ color: '#71717a', fontSize: '1rem' }}>
            No cohort data available for the selected filter.
          </Typography>
        </Box>
      )}

      {displayData.length > 0 && (
        <>
          {/* Chart 1: Retention Rate per Cohort */}
          <Box
            sx={{
              bgcolor: '#1c1c1f',
              border: '1px solid #27272a',
              borderRadius: 2,
              p: 3,
              mb: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <TrendingUp size={20} color="#4ade80" />
              <Typography sx={{ fontWeight: 600, color: '#fafafa', fontSize: '1rem' }}>
                Retention Rate by Cohort
              </Typography>
            </Box>
            <Typography sx={{ color: '#71717a', fontSize: '0.8rem', mb: 2 }}>
              {'Percentage of participants who attended >=50% of total weeks'}
            </Typography>
            <Box sx={{ width: '100%', height: { xs: 300, md: 400 } }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={displayData}
                  margin={{ top: 8, right: 16, left: -8, bottom: 60 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#3f3f46"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="shortLabel"
                    tick={{ fill: '#a1a1aa', fontSize: 11 }}
                    axisLine={{ stroke: '#3f3f46' }}
                    tickLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: '#a1a1aa', fontSize: 12 }}
                    axisLine={{ stroke: '#3f3f46' }}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <RechartsTooltip
                    cursor={{ fill: 'rgba(249,115,22,0.08)' }}
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: '#fb923c', fontWeight: 600 }}
                    formatter={(value: number) => [`${value}%`, 'Retention Rate']}
                  />
                  <Bar dataKey="retentionRate" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    {displayData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Box>

          {/* Chart 2: Retention vs Completion - Composed Chart */}
          <Box
            sx={{
              bgcolor: '#1c1c1f',
              border: '1px solid #27272a',
              borderRadius: 2,
              p: 3,
              mb: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Target size={20} color="#38bdf8" />
              <Typography sx={{ fontWeight: 600, color: '#fafafa', fontSize: '1rem' }}>
                Retention Rate vs Completion Percentage
              </Typography>
            </Box>
            <Typography sx={{ color: '#71717a', fontSize: '0.8rem', mb: 2 }}>
              Comparing retention rates against cohort completion across all cohorts
            </Typography>
            <Box sx={{ width: '100%', height: { xs: 300, md: 400 } }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={displayData}
                  margin={{ top: 8, right: 16, left: -8, bottom: 60 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#3f3f46"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="shortLabel"
                    tick={{ fill: '#a1a1aa', fontSize: 11 }}
                    axisLine={{ stroke: '#3f3f46' }}
                    tickLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: '#a1a1aa', fontSize: 12 }}
                    axisLine={{ stroke: '#3f3f46' }}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <RechartsTooltip
                    cursor={{ fill: 'rgba(249,115,22,0.08)' }}
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: '#fb923c', fontWeight: 600 }}
                    formatter={(value: number, name: string) => [
                      `${value}%`,
                      name === 'retentionRate' ? 'Retention Rate' : 'Completion Rate',
                    ]}
                  />
                  <Legend
                    wrapperStyle={{ color: '#a1a1aa', fontSize: 12, paddingTop: 8 }}
                    formatter={(value: string) =>
                      value === 'retentionRate' ? 'Retention Rate' : 'Completion Rate'
                    }
                  />
                  <Bar
                    dataKey="retentionRate"
                    fill="#fb923c"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                    opacity={0.85}
                  />
                  <Line
                    type="monotone"
                    dataKey="completionRate"
                    stroke="#38bdf8"
                    strokeWidth={2.5}
                    dot={{ fill: '#38bdf8', r: 5, strokeWidth: 0 }}
                    activeDot={{
                      r: 7,
                      stroke: '#38bdf8',
                      strokeWidth: 2,
                      fill: '#18181b',
                    }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </Box>
          </Box>

          {/* Chart 3: 2D Scatter Plot */}
          <Box
            sx={{
              bgcolor: '#1c1c1f',
              border: '1px solid #27272a',
              borderRadius: 2,
              p: 3,
              mb: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <BarChart3 size={20} color="#a78bfa" />
              <Typography sx={{ fontWeight: 600, color: '#fafafa', fontSize: '1rem' }}>
                Cohort Performance Distribution
              </Typography>
            </Box>
            <Typography sx={{ color: '#71717a', fontSize: '0.8rem', mb: 2 }}>
              Each point represents a cohort. Position shows retention vs completion,
              size indicates participant count.
            </Typography>
            <Box sx={{ width: '100%', height: { xs: 300, md: 400 } }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 16, right: 16, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis
                    type="number"
                    dataKey="completionRate"
                    name="Completion Rate"
                    unit="%"
                    domain={[0, 100]}
                    tick={{ fill: '#a1a1aa', fontSize: 12 }}
                    axisLine={{ stroke: '#3f3f46' }}
                    tickLine={false}
                    label={{
                      value: 'Completion Rate (%)',
                      position: 'insideBottom',
                      offset: -4,
                      fill: '#71717a',
                      fontSize: 12,
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="retentionRate"
                    name="Retention Rate"
                    unit="%"
                    domain={[0, 100]}
                    tick={{ fill: '#a1a1aa', fontSize: 12 }}
                    axisLine={{ stroke: '#3f3f46' }}
                    tickLine={false}
                    label={{
                      value: 'Retention Rate (%)',
                      angle: -90,
                      position: 'insideLeft',
                      offset: 8,
                      fill: '#71717a',
                      fontSize: 12,
                    }}
                  />
                  <ZAxis
                    type="number"
                    dataKey="totalParticipants"
                    range={[80, 400]}
                    name="Participants"
                  />
                  <RechartsTooltip
                    contentStyle={tooltipStyle}
                    cursor={{ strokeDasharray: '3 3', stroke: '#71717a' }}
                    formatter={(value: number, name: string) => [
                      name === 'Participants' ? value : `${value}%`,
                      name,
                    ]}
                    labelFormatter={(
                      _: unknown,
                      payload: Array<{ payload?: CohortMetric }>,
                    ) => {
                      if (payload?.[0]?.payload) return payload[0].payload.label;
                      return '';
                    }}
                  />
                  <Scatter data={displayData} name="Cohorts">
                    {displayData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                        opacity={0.85}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </Box>
          </Box>

          {/* Detail Table */}
          <Box
            sx={{
              bgcolor: '#1c1c1f',
              border: '1px solid #27272a',
              borderRadius: 2,
              p: 3,
            }}
          >
            <Typography
              sx={{ fontWeight: 600, color: '#fafafa', fontSize: '1rem', mb: 2 }}
            >
              Cohort Details
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {[
                      'Cohort',
                      'Season',
                      'Participants',
                      'Retained',
                      'Retention %',
                      'Avg Attendance %',
                      'Completion %',
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: 'left',
                          padding: '10px 12px',
                          color: '#a1a1aa',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          borderBottom: '1px solid #27272a',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayData.map((m, i) => (
                    <tr
                      key={m.cohortId}
                      style={{ borderBottom: '1px solid #1c1c1f' }}
                    >
                      <td
                        style={{
                          padding: '10px 12px',
                          color: CHART_COLORS[i % CHART_COLORS.length],
                          fontSize: '0.85rem',
                          fontWeight: 500,
                        }}
                      >
                        {cohortTypeToName(m.type)}
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          color: '#d4d4d8',
                          fontSize: '0.85rem',
                        }}
                      >
                        S{m.season}
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          color: '#d4d4d8',
                          fontSize: '0.85rem',
                        }}
                      >
                        {m.totalParticipants}
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          color: '#d4d4d8',
                          fontSize: '0.85rem',
                        }}
                      >
                        {m.retainedStudents}
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          color: '#4ade80',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                        }}
                      >
                        {m.retentionRate}%
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          color: '#facc15',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                        }}
                      >
                        {m.avgAttendanceRate}%
                      </td>
                      <td
                        style={{
                          padding: '10px 12px',
                          color: '#38bdf8',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                        }}
                      >
                        {m.completionRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
};

export default CohortMetrics;
