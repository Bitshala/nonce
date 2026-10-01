/** Buckets items by key, keeping first-seen key order and each bucket's item order. */
export const groupBy = <T, K>(
  items: readonly T[],
  keyOf: (item: T) => K
): Map<K, T[]> => {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return groups;
};

export const byWeek = (a: { weekNumber: number }, b: { weekNumber: number }) =>
  a.weekNumber - b.weekNumber;
