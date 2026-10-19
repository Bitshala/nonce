/**
 * Deadlines land on the last instant of their day in IST, the timezone the
 * cohorts run in, whatever the viewer's own timezone. Shared so the API's
 * deadlines and the UI's "has graduation passed" cannot disagree.
 */
export function endOfDayIst(date: Date): Date {
  const end = new Date(date);
  // 23:59:59.999 IST = 18:29:59.999 UTC
  end.setUTCHours(18, 29, 59, 999);
  return end;
}

/**
 * Whether a cohort's graduation day is over. Exclusive, like
 * `Assignment.isPastDeadline`: graduation day itself still counts as open.
 */
export function isGraduationPassed(
  graduationScheduledDate: Date,
  now: Date
): boolean {
  return now > endOfDayIst(graduationScheduledDate);
}
