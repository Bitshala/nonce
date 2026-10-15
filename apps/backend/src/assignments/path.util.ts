/**
 * Path rules for the commit endpoint.
 *
 * These checks are authoritative rather than advisory: students hold no GitHub
 * credentials, so this API is the only way anything reaches a student
 * repository. There is no push path around them.
 */

import { MAX_FILE_BYTES } from '@nonce/shared/constants';
import { isProtectedPath, matchesGlob } from '@nonce/shared/protected-paths';

// The glob matcher lives in the shared package so the editor greys out exactly
// the paths refused here. Re-exported so callers keep importing from this file.
export { isProtectedPath, matchesGlob };

// Per-file ceiling, shared with the editor so it can skip what would be
// refused. Re-exported so callers keep importing from this file.
export { MAX_FILE_BYTES };

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

    // Any component, in any case — the same rule git applies when it checks a
    // tree out, so a path it would refuse can never be committed here.
    if (segments.some((segment) => segment.toLowerCase() === '.git')) {
        return { reason: 'path is inside .git' };
    }

    return { path: segments.join('/') };
}

/**
 * Paths in a save that name a directory holding a protected file. Writing a
 * file over that directory, or deleting it, would replace or remove the
 * protected file without ever naming it, so a glob check on the path alone
 * lets it through. Decided against the real tree, because a glob cannot tell
 * which paths are directories.
 */
export function findProtectedDirectories(params: {
    paths: string[];
    treePaths: string[];
    protectedPaths: string[];
}): PathViolation[] {
    const protectedFiles = params.treePaths.filter((path) =>
        isProtectedPath(path, params.protectedPaths),
    );
    return params.paths
        .filter((path) =>
            protectedFiles.some((file) => file.startsWith(`${path}/`)),
        )
        .map((path) => ({
            path,
            reason: 'path is a directory that holds protected files',
        }));
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
