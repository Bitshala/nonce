import type { StudentData } from "../types/student";

export const getStudentNameFromUrl = (): string | null => {
  const urlParams = new URLSearchParams(window.location.search);
  const fromParams = urlParams.get('student');
  if (fromParams) return fromParams;

  // Extract from path (assuming format like /students/Alice%20Johnson)
  const pathParts = window.location.pathname.split('/');
  const nameFromPath = pathParts[pathParts.length - 1];
  return nameFromPath ? decodeURIComponent(nameFromPath) : null;
};

// Exports student data as a JSON file
export const exportStudentData = (student: StudentData | null): void => {
  if (!student) return;

  const dataStr = JSON.stringify(student, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${student.name.replace(/\s+/g, '_')}_data.json`;
  link.click();
  URL.revokeObjectURL(url);
};

export const getProgressColor = (percentage: number): string => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-amber-500';
    return 'bg-red-500';
};