// The frontend's own fellowship enums (as in utils/fellowshipFormat.ts), so the
// keys match the DTO types these functions take.
import {
  FellowshipApplicationStatus,
  FellowshipKind,
  FellowshipReportStatus,
  FellowshipStatus,
  FellowshipType,
  type GetFellowshipApplicationResponseDto,
  type GetFellowshipReportResponseDto,
  type GetFellowshipResponseDto,
} from '../types/fellowship';

// Aggregates for the admin fellowship overview (#26), computed client-side from
// the same list endpoints the admin tables use. Pure so the rules below can be
// checked without rendering anything.

export interface ReportPeriod {
  year: number;
  month: number; // 1-12
}

export interface OverdueFellowship {
  fellowshipId: string;
  fellowName: string;
  project: string | null;
  status: FellowshipStatus;
  missing: ReportPeriod[];
}

export interface FellowshipOverview {
  fellowships: {
    total: number;
    byStatus: Record<FellowshipStatus, number>;
    byType: Record<FellowshipType, number>;
    byKind: Record<FellowshipKind, number>;
  };
  // Admin lists never include drafts, so the funnel starts at "submitted".
  funnel: {
    submitted: number;
    inReview: number;
    changesRequested: number;
    accepted: number;
    rejected: number;
    // accepted / (accepted + rejected); null until something is decided.
    acceptanceRate: number | null;
  };
  // Payouts follow report approval: an APPROVED monthly report is one paid
  // month at the fellowship's monthly amount, a SUBMITTED one is pending. The
  // app records no actual payments, so these are derived, not ledger figures.
  payouts: {
    paidUsd: number;
    pendingUsd: number;
    paidReports: number;
    pendingReports: number;
    // Reports whose fellowship has no monthly amount, so add nothing above.
    reportsWithoutAmount: number;
  };
  compliance: {
    overdueReports: number;
    overdueFellowships: OverdueFellowship[];
    awaitingReview: number;
  };
}

const countBy = <K extends string>(
  keys: K[],
  values: K[]
): Record<K, number> => {
  const counts = Object.fromEntries(keys.map(k => [k, 0])) as Record<K, number>;
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return counts;
};

// Monthly amounts are decimal strings ("1500.00"); sum in cents so totals do
// not pick up floating-point drift.
const toCents = (amountUsd: string | null): number | null => {
  if (amountUsd == null) return null;
  const value = Number(amountUsd);
  return Number.isFinite(value) ? Math.round(value * 100) : null;
};

const FILED_REPORT_STATUSES = new Set<FellowshipReportStatus>([
  FellowshipReportStatus.SUBMITTED,
  FellowshipReportStatus.APPROVED,
]);

/**
 * The report months a fellowship owed by `now`: every UTC calendar month its
 * contract overlaps that has already ended. Mirrors the backend's reminder
 * rule (startDate < monthEnd and endDate >= monthStart, ACTIVE or COMPLETED).
 */
export const owedReportPeriods = (
  fellowship: GetFellowshipResponseDto,
  now: Date
): ReportPeriod[] => {
  if (
    fellowship.status !== FellowshipStatus.ACTIVE &&
    fellowship.status !== FellowshipStatus.COMPLETED
  ) {
    return [];
  }
  if (!fellowship.startDate || !fellowship.endDate) return [];
  const start = new Date(fellowship.startDate);
  const end = new Date(fellowship.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

  const periods: ReportPeriod[] = [];
  let year = start.getUTCFullYear();
  let month = start.getUTCMonth(); // 0-indexed while iterating
  for (;;) {
    const monthStart = new Date(Date.UTC(year, month, 1));
    const monthEnd = new Date(Date.UTC(year, month + 1, 1));
    if (monthStart > end || monthEnd > now) break;
    if (start < monthEnd && end >= monthStart) {
      periods.push({ year, month: month + 1 });
    }
    month += 1;
    if (month === 12) {
      month = 0;
      year += 1;
    }
  }
  return periods;
};

export const buildFellowshipOverview = (
  fellowships: GetFellowshipResponseDto[],
  applications: GetFellowshipApplicationResponseDto[],
  reports: GetFellowshipReportResponseDto[],
  now: Date = new Date()
): FellowshipOverview => {
  const funnelCounts = countBy(
    Object.values(FellowshipApplicationStatus),
    applications.map(a => a.status)
  );
  const accepted = funnelCounts[FellowshipApplicationStatus.ACCEPTED];
  const rejected = funnelCounts[FellowshipApplicationStatus.REJECTED];

  const amountByFellowship = new Map(
    fellowships.map(f => [f.id, toCents(f.amountUsd)])
  );
  let paidCents = 0;
  let pendingCents = 0;
  let paidReports = 0;
  let pendingReports = 0;
  let reportsWithoutAmount = 0;
  const filed = new Set<string>();
  const periodKey = (fellowshipId: string, year: number, month: number) =>
    `${fellowshipId}:${year}-${month}`;

  for (const report of reports) {
    if (FILED_REPORT_STATUSES.has(report.status)) {
      filed.add(periodKey(report.fellowshipId, report.year, report.month));
    }
    if (
      report.status !== FellowshipReportStatus.APPROVED &&
      report.status !== FellowshipReportStatus.SUBMITTED
    ) {
      continue;
    }
    const cents =
      amountByFellowship.get(report.fellowshipId) ??
      toCents(report.fellowship?.amountUsd ?? null);
    if (cents == null) {
      reportsWithoutAmount += 1;
    }
    if (report.status === FellowshipReportStatus.APPROVED) {
      paidReports += 1;
      paidCents += cents ?? 0;
    } else {
      pendingReports += 1;
      pendingCents += cents ?? 0;
    }
  }

  const overdueFellowships: OverdueFellowship[] = [];
  for (const fellowship of fellowships) {
    const missing = owedReportPeriods(fellowship, now).filter(
      p => !filed.has(periodKey(fellowship.id, p.year, p.month))
    );
    if (missing.length > 0) {
      overdueFellowships.push({
        fellowshipId: fellowship.id,
        fellowName:
          fellowship.userName ?? fellowship.userEmail ?? 'Unknown fellow',
        project: fellowship.projectName || fellowship.proposalTitle,
        status: fellowship.status,
        missing,
      });
    }
  }
  // Most missing first, then by name, so the worst cases lead the list.
  overdueFellowships.sort(
    (a, b) =>
      b.missing.length - a.missing.length ||
      a.fellowName.localeCompare(b.fellowName)
  );

  return {
    fellowships: {
      total: fellowships.length,
      byStatus: countBy(
        Object.values(FellowshipStatus),
        fellowships.map(f => f.status)
      ),
      byType: countBy(
        Object.values(FellowshipType),
        fellowships.map(f => f.type)
      ),
      byKind: countBy(
        Object.values(FellowshipKind),
        fellowships.map(f => f.kind)
      ),
    },
    funnel: {
      submitted: applications.filter(
        a => a.status !== FellowshipApplicationStatus.DRAFT
      ).length,
      inReview: funnelCounts[FellowshipApplicationStatus.SUBMITTED],
      changesRequested:
        funnelCounts[FellowshipApplicationStatus.CHANGES_REQUESTED],
      accepted,
      rejected,
      acceptanceRate:
        accepted + rejected > 0 ? accepted / (accepted + rejected) : null,
    },
    payouts: {
      paidUsd: paidCents / 100,
      pendingUsd: pendingCents / 100,
      paidReports,
      pendingReports,
      reportsWithoutAmount,
    },
    compliance: {
      overdueReports: overdueFellowships.reduce(
        (n, f) => n + f.missing.length,
        0
      ),
      overdueFellowships,
      awaitingReview: pendingReports,
    },
  };
};
