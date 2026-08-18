/**
 * Convert an array of row objects to a CSV string and trigger a browser download.
 *
 * @param headers  - Column headers displayed in the first row.
 * @param rows     - Array of rows, each row is an array of cell values.
 * @param filename - Name of the downloaded file (should end with `.csv`).
 */
export function downloadCSV(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
  filename: string,
) {
  if (rows.length === 0) return;

  const csvContent = [headers, ...rows]
    .map((row) => row.map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
