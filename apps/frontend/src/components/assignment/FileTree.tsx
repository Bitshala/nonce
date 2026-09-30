import { useMemo, useState } from 'react';
import { Box, Collapse, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import type { RepoTreeEntryResponse } from '@nonce/shared';
import { fontFamilyMono } from '../fellowship/theme';
import { WORKSPACE } from './workspaceColors';
import {
  belongsToLanguage,
  fileRole,
  isBriefPath,
  type FileRole,
} from './languages';

interface Props {
  entries: RepoTreeEntryResponse[];
  activePath: string | null;
  dirtyPaths: Set<string>;
  protectedPaths: string[];
  onSelect: (path: string) => void;
  /** Selected language folder; its files are listed without the folder prefix. */
  language?: string | null;
  languages?: string[];
}

interface Item {
  path: string;
  name: string;
}

const GROUPS: { role: Exclude<FileRole, 'grader'>; title: string }[] = [
  { role: 'answer', title: 'YOUR ANSWER' },
  { role: 'provided', title: 'PROVIDED' },
  { role: 'other', title: 'OTHER' },
];

const Overline = ({ children }: { children: string }) => (
  <Typography
    sx={{
      px: 2,
      pt: 1.75,
      pb: 0.5,
      fontSize: 11.5,
      letterSpacing: '0.08em',
      fontWeight: 700,
      color: WORKSPACE.faint,
    }}
  >
    {children}
  </Typography>
);

/**
 * The student's view of the repository, grouped by what each file is for: the
 * answer they write, the helpers the template provides, and everything else.
 * Grader files are pinned to the bottom, read-only.
 *
 * Under the no-GitHub-access design this is the only view of the repo, so it
 * lists every file including ones that cannot be edited — a protected file
 * that can be read is far less confusing than one that is missing.
 */
export const FileTree = ({
  entries,
  activePath,
  dirtyPaths,
  protectedPaths,
  onSelect,
  language = null,
  languages = [],
}: Props) => {
  const [graderOpen, setGraderOpen] = useState(false);

  const { groups, grader } = useMemo(() => {
    const prefix = language ? `${language}/` : null;
    const buckets: Record<FileRole, Item[]> = {
      answer: [],
      provided: [],
      other: [],
      grader: [],
    };
    for (const entry of entries) {
      if (entry.type === 'tree') continue;
      if (
        isBriefPath(entry.path) ||
        !belongsToLanguage(entry.path, language, languages)
      )
        continue;
      const name =
        prefix && entry.path.startsWith(prefix)
          ? entry.path.slice(prefix.length)
          : entry.path;
      buckets[fileRole(entry.path, protectedPaths)].push({
        path: entry.path,
        name,
      });
    }
    for (const list of Object.values(buckets))
      list.sort((a, b) => a.name.localeCompare(b.name));
    return { groups: buckets, grader: buckets.grader };
  }, [entries, protectedPaths, language, languages]);

  const row = (item: Item, role: FileRole) => {
    const isActive = item.path === activePath;
    const isDirty = dirtyPaths.has(item.path);
    return (
      <Box
        key={item.path}
        role="button"
        tabIndex={0}
        onClick={() => onSelect(item.path)}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(item.path);
          }
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mx: 1,
          px: 1.5,
          height: 30,
          cursor: 'pointer',
          borderRadius: '6px',
          bgcolor: isActive ? 'action.selected' : 'transparent',
          '&:hover': { bgcolor: isActive ? 'action.selected' : 'action.hover' },
        }}
      >
        {role === 'answer' && (
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: WORKSPACE.accent,
              flexShrink: 0,
            }}
          />
        )}
        {role === 'grader' && (
          <LockOutlinedIcon sx={{ fontSize: 13, color: WORKSPACE.faint }} />
        )}
        <Typography
          noWrap
          sx={{
            fontFamily: fontFamilyMono,
            fontSize: 13,
            fontWeight: isActive ? 700 : 500,
            color: isActive
              ? 'common.white'
              : role === 'grader'
                ? WORKSPACE.muted
                : 'text.primary',
            flex: 1,
            minWidth: 0,
          }}
        >
          {item.name}
        </Typography>
        {/* Unsaved work is the one thing a student must never lose track of. */}
        {isDirty && (
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: 'warning.main',
              flexShrink: 0,
            }}
          />
        )}
        {role === 'answer' && !isDirty && (
          <Typography sx={{ fontSize: 11.5, color: WORKSPACE.faint }}>
            edit
          </Typography>
        )}
      </Box>
    );
  };

  if (entries.length === 0) {
    return (
      <Typography sx={{ p: 2, fontSize: 13, color: 'text.secondary' }}>
        This repository is empty.
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
      }}
    >
      <Box
        sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}
      >
        {GROUPS.map(
          ({ role, title }) =>
            groups[role].length > 0 && (
              <Box key={role}>
                <Overline>{title}</Overline>
                {groups[role].map(item => row(item, role))}
              </Box>
            )
        )}
      </Box>

      {grader.length > 0 && (
        <Box
          sx={{
            flexShrink: 0,
            borderTop: `1px solid ${WORKSPACE.line}`,
            mx: 1,
            mb: 1,
          }}
        >
          <Collapse in={graderOpen} unmountOnExit>
            <Box sx={{ maxHeight: 220, overflowY: 'auto', py: 0.5, mx: -1 }}>
              {grader.map(item => row(item, 'grader'))}
            </Box>
          </Collapse>
          <Box
            role="button"
            tabIndex={0}
            aria-expanded={graderOpen}
            onClick={() => setGraderOpen(open => !open)}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setGraderOpen(open => !open);
              }
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              height: 40,
              cursor: 'pointer',
              color: 'text.secondary',
              '&:hover': { color: 'common.white' },
            }}
          >
            <LockOutlinedIcon sx={{ fontSize: 14 }} />
            <Typography sx={{ fontSize: 12.5, fontWeight: 600, flex: 1 }}>
              {grader.length} grader files
            </Typography>
            <ChevronRightIcon
              sx={{
                fontSize: 16,
                transition: 'transform .2s',
                transform: graderOpen ? 'rotate(90deg)' : 'none',
              }}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};
