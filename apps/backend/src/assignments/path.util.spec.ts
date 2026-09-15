import {
    MAX_FILE_BYTES,
    isProtectedPath,
    matchesGlob,
    normalizeRepoPath,
    validateCommitPaths,
} from '@/assignments/path.util';

// These rules are the whole write-side boundary: no student holds credentials
// for their repository, so there is no push path that could bypass them. A hole
// here is not "defence in depth weakened", it is the door left open.
describe('path.util — normalizeRepoPath', () => {
    it('accepts an ordinary nested path', () => {
        expect(normalizeRepoPath('src/main.rs')).toEqual({
            path: 'src/main.rs',
        });
    });

    it('trims surrounding whitespace', () => {
        expect(normalizeRepoPath('  src/main.rs  ')).toEqual({
            path: 'src/main.rs',
        });
    });

    it.each([
        ['', 'path is empty'],
        ['   ', 'path is empty'],
        ['/etc/passwd', 'path is absolute'],
        ['C:/windows/system32', 'path is absolute'],
        ['src\\main.rs', 'path contains a backslash'],
        ['../outside.txt', 'path contains a relative segment'],
        ['src/../../outside.txt', 'path contains a relative segment'],
        ['src/./main.rs', 'path contains a relative segment'],
        ['src//main.rs', 'path contains an empty segment'],
        ['.git/config', 'path is inside .git'],
        ['src/main\0.rs', 'path contains a null byte'],
    ])('rejects %p', (input, reason) => {
        expect(normalizeRepoPath(input)).toEqual({ reason });
    });

    it('allows .git as a name that is not the root directory', () => {
        // `.gitignore` and `src/.git-keep` are ordinary files; only a top-level
        // `.git/` directory is git's own bookkeeping.
        expect(normalizeRepoPath('.gitignore')).toEqual({ path: '.gitignore' });
        expect(normalizeRepoPath('src/.git-keep')).toEqual({
            path: 'src/.git-keep',
        });
    });
});

describe('path.util — matchesGlob', () => {
    it('matches everything under a ** prefix', () => {
        expect(matchesGlob('.github/workflows/grade.yml', '.github/**')).toBe(
            true,
        );
        expect(matchesGlob('.github/dependabot.yml', '.github/**')).toBe(true);
    });

    it('does not let a lookalike prefix through', () => {
        expect(matchesGlob('src/.github-notes.md', '.github/**')).toBe(false);
        expect(matchesGlob('dotgithub/x.yml', '.github/**')).toBe(false);
    });

    it('treats a single * as one segment only', () => {
        expect(matchesGlob('Cargo.lock', '*.lock')).toBe(true);
        expect(matchesGlob('deep/Cargo.lock', '*.lock')).toBe(false);
    });

    it('matches an exact path', () => {
        expect(matchesGlob('Makefile', 'Makefile')).toBe(true);
        expect(matchesGlob('Makefile.in', 'Makefile')).toBe(false);
    });

    it('does not treat dots in the pattern as regex wildcards', () => {
        expect(matchesGlob('aXlock', '*.lock')).toBe(false);
    });
});

describe('path.util — validateCommitPaths', () => {
    const protectedPaths = ['.github/**'];

    it('accepts a clean save and reports the normalized paths', () => {
        const result = validateCommitPaths({
            files: [{ path: ' src/main.rs ', byteLength: 10 }],
            deletedPaths: ['src/old.rs'],
            protectedPaths,
        });

        expect(result.violations).toEqual([]);
        expect(result.normalized.get(' src/main.rs ')).toBe('src/main.rs');
        expect(result.normalized.get('src/old.rs')).toBe('src/old.rs');
    });

    it('refuses to write a protected path', () => {
        const result = validateCommitPaths({
            files: [{ path: '.github/workflows/grade.yml', byteLength: 10 }],
            deletedPaths: [],
            protectedPaths,
        });

        expect(result.violations).toEqual([
            {
                path: '.github/workflows/grade.yml',
                reason: 'path is protected and cannot be modified',
            },
        ]);
    });

    it('refuses to delete a protected path', () => {
        // Deleting the grading config is as effective as editing it.
        const result = validateCommitPaths({
            files: [],
            deletedPaths: ['.github/workflows/grade.yml'],
            protectedPaths,
        });

        expect(result.violations).toHaveLength(1);
    });

    it('reports every offending path rather than stopping at the first', () => {
        const result = validateCommitPaths({
            files: [
                { path: '../escape.rs', byteLength: 1 },
                { path: '.github/x.yml', byteLength: 1 },
            ],
            deletedPaths: ['/absolute'],
            protectedPaths,
        });

        expect(result.violations).toHaveLength(3);
    });

    it('rejects a file over the per-file limit', () => {
        const result = validateCommitPaths({
            files: [{ path: 'big.bin', byteLength: MAX_FILE_BYTES + 1 }],
            deletedPaths: [],
            protectedPaths,
        });

        expect(result.violations[0].reason).toContain('per-file limit');
    });

    it('rejects a save whose total exceeds the request limit', () => {
        const files = Array.from({ length: 6 }, (_, index) => ({
            path: `file-${index}.bin`,
            byteLength: MAX_FILE_BYTES,
        }));

        const result = validateCommitPaths({
            files,
            deletedPaths: [],
            protectedPaths,
        });

        expect(result.violations).toEqual([
            expect.objectContaining({ path: '*' }),
        ]);
    });

    it('rejects the same path twice in one save', () => {
        // Two entries for one path would make the resulting tree depend on
        // ordering, which is not something a save should ever do.
        const result = validateCommitPaths({
            files: [
                { path: 'src/main.rs', byteLength: 1 },
                { path: 'src/main.rs', byteLength: 1 },
            ],
            deletedPaths: [],
            protectedPaths,
        });

        expect(result.violations[0].reason).toContain('more than once');
    });

    it('treats a path written and deleted in one save as a duplicate', () => {
        const result = validateCommitPaths({
            files: [{ path: 'src/main.rs', byteLength: 1 }],
            deletedPaths: ['src/main.rs'],
            protectedPaths,
        });

        expect(result.violations[0].reason).toContain('more than once');
    });
});

describe('path.util — isProtectedPath', () => {
    it('is false when no patterns are configured', () => {
        expect(isProtectedPath('.github/workflows/x.yml', [])).toBe(false);
    });

    it('matches against any of the configured patterns', () => {
        const patterns = ['.github/**', 'Cargo.lock'];
        expect(isProtectedPath('Cargo.lock', patterns)).toBe(true);
        expect(isProtectedPath('src/main.rs', patterns)).toBe(false);
    });
});
