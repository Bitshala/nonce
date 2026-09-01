/**
 * Path rules for the commit endpoint.
 *
 * These checks are authoritative rather than advisory: students hold no GitHub
 * credentials, so this API is the only way anything reaches a student
 * repository. There is no push path around them.
 */

/** Per-file ceiling. Anything larger is not something the editor can edit. */
export const MAX_FILE_BYTES = 1024 * 1024;

/** Ceiling on one save's total payload. */
export const MAX_TOTAL_BYTES = 5 * 1024 * 1024;

export interface PathViolation {
    path: string;
    reason: string;
}

/**
 * Rejects anything that could escape the repository root or touch git's own
 * bookkeeping. Returns the cleaned path, or a reason it was refused.
 */
export function normalizeRepoPath(
    raw: string,
): { path: string } | { reason: string } {
    const trimmed = raw.trim();

    if (trimmed.length === 0) return { reason: 'path is empty' };
    if (trimmed.includes('\0')) return { reason: 'path contains a null byte' };
    if (trimmed.includes('\\')) {
        return { reason: 'path contains a backslash' };
    }
    if (trimmed.startsWith('/')) return { reason: 'path is absolute' };
    // Windows-style drive letters would also be absolute once written out.
    if (/^[a-zA-Z]:/.test(trimmed)) return { reason: 'path is absolute' };

    const segments = trimmed.split('/');
    for (const segment of segments) {
        if (segment === '') {
            return { reason: 'path contains an empty segment' };
        }
        if (segment === '.' || segment === '..') {
            return { reason: 'path contains a relative segment' };
        }
    }

    if (segments[0] === '.git') {
        return { reason: 'path is inside .git' };
    }

    return { path: segments.join('/') };
}

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
        .map((part) => part.replace(/\*/g, '[^/]*'))
        .join('.*');

    return new RegExp(`^${source}$`).test(path);
}

export function isProtectedPath(path: string, patterns: string[]): boolean {
    return patterns.some((pattern) => matchesGlob(path, pattern));
}

/**
 * Validates every path in one save. Collects all violations rather than
 * failing on the first, so the editor can highlight everything at once.
 */
export function validateCommitPaths(params: {
    files: { path: string; byteLength: number }[];
    deletedPaths: string[];
    protectedPaths: string[];
}): { normalized: Map<string, string>; violations: PathViolation[] } {
    const violations: PathViolation[] = [];
    const normalized = new Map<string, string>();
    const seen = new Set<string>();
    let totalBytes = 0;

    const check = (raw: string, byteLength: number | null) => {
        const result = normalizeRepoPath(raw);
        if ('reason' in result) {
            violations.push({ path: raw, reason: result.reason });
            return;
        }

        const path = result.path;
        if (isProtectedPath(path, params.protectedPaths)) {
            violations.push({
                path: raw,
                reason: 'path is protected and cannot be modified',
            });
            return;
        }
        if (seen.has(path)) {
            violations.push({
                path: raw,
                reason: 'path appears more than once in this save',
            });
            return;
        }
        if (byteLength !== null && byteLength > MAX_FILE_BYTES) {
            violations.push({
                path: raw,
                reason: `file exceeds the ${MAX_FILE_BYTES}-byte per-file limit`,
            });
            return;
        }

        seen.add(path);
        normalized.set(raw, path);
        if (byteLength !== null) totalBytes += byteLength;
    };

    for (const file of params.files) check(file.path, file.byteLength);
    for (const path of params.deletedPaths) check(path, null);

    if (totalBytes > MAX_TOTAL_BYTES) {
        violations.push({
            path: '*',
            reason: `save exceeds the ${MAX_TOTAL_BYTES}-byte total limit`,
        });
    }

    return { normalized, violations };
}
