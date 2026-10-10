import { isProtectedPath } from '@nonce/shared';
import type { RepoTreeEntryResponse } from '@nonce/shared';

/**
 * Display names, keyed by both language-folder names (`python/`) and Monaco
 * language ids (`ini`), so the selector and the status bar share one table.
 */
const LABELS: Record<string, string> = {
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
  bash: 'Bash',
  php: 'PHP',
  dart: 'Dart',
  scala: 'Scala',
  haskell: 'Haskell',
  elixir: 'Elixir',
  zig: 'Zig',
  lua: 'Lua',
  perl: 'Perl',
  json: 'JSON',
  markdown: 'Markdown',
  yaml: 'YAML',
  ini: 'TOML',
  shell: 'Shell',
  sql: 'SQL',
  html: 'HTML',
  css: 'CSS',
};

/** Top-level folders that count as a student language; anything else is plumbing. */
const LANGUAGE_DIRS = new Set([
  'python',
  'rust',
  'cpp',
  'c',
  'go',
  'java',
  'kotlin',
  'typescript',
  'javascript',
  'ruby',
  'swift',
  'csharp',
  'bash',
  'php',
  'dart',
  'scala',
  'haskell',
  'elixir',
  'zig',
  'lua',
  'perl',
]);

export const languageName = (dir: string) =>
  LABELS[dir] ?? dir.charAt(0).toUpperCase() + dir.slice(1);

const BY_EXTENSION: Record<string, string> = {
  rs: 'rust',
  py: 'python',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  h: 'cpp',
  hpp: 'cpp',
  c: 'c',
  go: 'go',
  java: 'java',
  kt: 'kotlin',
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  json: 'json',
  md: 'markdown',
  yml: 'yaml',
  yaml: 'yaml',
  toml: 'ini',
  sh: 'shell',
  sql: 'sql',
  html: 'html',
  css: 'css',
};

/** Monaco needs a language id; the extension is the only hint we have. */
export const languageOf = (path: string) =>
  BY_EXTENSION[path.slice(path.lastIndexOf('.') + 1).toLowerCase()] ??
  'plaintext';

/** Display name for the status bar, from the active file. */
export const languageLabel = (path: string | null) =>
  (path && LABELS[languageOf(path)]) || 'Plain text';

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
    if (!LANGUAGE_DIRS.has(dir)) continue;
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
  !languages.some(
    other =>
      other !== language && (path === other || path.startsWith(`${other}/`))
  );

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
  if (/^(solution|answer|main|lib|index)\.[a-z]+$/i.test(name)) return 'answer';
  return name.startsWith('.') ? 'other' : 'provided';
}
