// TA assignment mapping for groups
const GROUP_TO_TA_MAP: Record<number, string> = {
  0: 'N/A',
  1: 'Apalok',
  2: 'BTC NOOB',
  3: 'Sagar',
  4: 'N/A',
  5: 'N/A',
};

/**
 * Get the TA name for a given group number
 * @param groupNumber - The group number (0-5)
 * @returns The TA name assigned to the group
 */
export const getTAForGroup = (groupNumber: number): string => {
  return GROUP_TO_TA_MAP[groupNumber] ?? 'N/A';
};

/**
 * Extract group number from group string (e.g., "Group 1" -> 1)
 * @param groupString - The group string (e.g., "Group 1")
 * @returns The group number
 */
export const getGroupNumber = (groupString: string): number => {
  const match = groupString.match(/Group (\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};
