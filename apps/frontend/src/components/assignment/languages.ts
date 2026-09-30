import { isProtectedPath } from '@nonce/shared';
import type { RepoTreeEntryResponse } from '@nonce/shared';

/** Top-level folders that hold the grader or repo plumbing, never a student language. */
const NOT_LANGUAGES = new Set(['test', 'tests', 'fixtures', 'grader', 'node_modules', 'docs']);

const NAMES: Record<string, string> = {
  python: 'Python',
  rust: 'Rust',
  cpp: 'C++',
  c: 'C',
  go: 'Go',
  java: 'Java',
  kotlin: 'Kotlin',
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  ruby: 'Ruby',
  swift: 'Swift',
  csharp: 'C#',
};

export const languageName = (dir: string) =>
  NAMES[dir] ?? dir.charAt(0).toUpperCase() + dir.slice(1);

export const isBriefPath = (path: string) => /^readme(\.[a-z]+)?$/i.test(path);

/**
 * Templates keep one top-level folder per language (`python/`, `rust/`, …)
 * next to the shared grader files. A folder counts as a language when it holds
 * at least one file the student may edit.
 */
export function detectLanguages(
  entries: RepoTreeEntryResponse[],
  protectedPaths: string[]
): string[] {
  const dirs = new Set<string>();
  for (const entry of entries) {
    if (entry.type === 'tree') continue;
    const slash = entry.path.indexOf('/');
    if (slash === -1) continue;
    const dir = entry.path.slice(0, slash);
    if (dir.startsWith('.') || NOT_LANGUAGES.has(dir)) continue;
    if (!isProtectedPath(entry.path, protectedPaths)) dirs.add(dir);
  }
  return [...dirs].sort();
}

/** A path is in view unless it lives inside a different language's folder. */
export const belongsToLanguage = (
  path: string,
  language: string | null,
  languages: string[]
) =>
  !language ||
  !languages.some(other => other !== language && (path === other || path.startsWith(`${other}/`)));

export type FileRole = 'answer' | 'provided' | 'other' | 'grader';

const basename = (path: string) => path.slice(path.lastIndexOf('/') + 1);

/**
 * How the file tree groups a file. The API has no "this is the answer file"
 * flag, so the answer is the conventionally named entry point; everything else
 * the template ships is provided, and dotfiles are just repo housekeeping.
 */
export function fileRole(path: string, protectedPaths: string[]): FileRole {
  if (isProtectedPath(path, protectedPaths)) return 'grader';
  const name = basename(path);
  if (/^(solution|answer|main)\.[a-z]+$/i.test(name)) return 'answer';
  return name.startsWith('.') ? 'other' : 'provided';
}
