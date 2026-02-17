export const getTodayDate = (): string => new Date().toISOString().split('T')[0];

export const formatDateForInput = (isoDate: string | null | undefined): string => {
  if (!isoDate) return '';
  try {
    return isoDate.split('T')[0];
  } catch {
    return '';
  }
};

export const calculateEndDate = (start: string, weeks: number): string => {
  if (!start) return '';
  const d = new Date(start);
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().split('T')[0];
};

export const calculateStartDate = (end: string, weeks: number): string => {
  if (!end) return '';
  const d = new Date(end);
  d.setDate(d.getDate() - weeks * 7);
  return d.toISOString().split('T')[0];
};

export const calculateRegistrationDeadline = (start: string): string => {
  if (!start) return '';
  const d = new Date(start);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};
