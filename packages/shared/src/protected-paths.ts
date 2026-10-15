// Protected-path matching. The API refuses to write these paths and the editor
// greys them out; both sides call this one matcher so a pattern can never lock
// a file in one place and not the other. The API stays authoritative — the
// editor only uses it for presentation.

/**
 * Matches a path against one glob. Deliberately supports only what assignment
 * configs need — `*` within a segment and `**` across segments — so no glob
 * dependency is required.
 */
export function matchesGlob(path: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  // Order matters: `**` has to be consumed before the single-segment `*`.
  const source = escaped
    .split('**')
    .map(part => part.replace(/\*/g, '[^/]*'))
    .join('.*');

  return new RegExp(`^${source}$`).test(path);
}

export function isProtectedPath(path: string, patterns: string[]): boolean {
  return patterns.some(pattern => matchesGlob(path, pattern));
}
