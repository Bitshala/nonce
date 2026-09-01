import { useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import {
  ChevronDown,
  ChevronRight,
  File as FileIcon,
  Lock,
} from 'lucide-react';
import type { RepoTreeEntryResponse } from '@nonce/shared';
import { fontFamilyMono } from '../fellowship/theme';

interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children: TreeNode[];
}

interface Props {
  entries: RepoTreeEntryResponse[];
  activePath: string | null;
  dirtyPaths: Set<string>;
  protectedPaths: string[];
  onSelect: (path: string) => void;
}

/**
 * The flat, recursive tree the API returns, rendered as a folder hierarchy.
 *
 * Under the no-GitHub-access design this is the student's only view of their
 * repository, so it shows every file including ones they cannot edit — a
 * protected file they can read is far less confusing than one that is missing.
 */
export const FileTree = ({
  entries,
  activePath,
  dirtyPaths,
  protectedPaths,
  onSelect,
}: Props) => {
  const root = useMemo(() => buildTree(entries), [entries]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (path: string) =>
    setCollapsed(previous => {
      const next = new Set(previous);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  const renderNode = (node: TreeNode, depth: number) => {
    const isCollapsed = collapsed.has(node.path);
    const isActive = node.path === activePath;
    const isDirty = dirtyPaths.has(node.path);
    const isLocked =
      !node.isDirectory && matchesAny(node.path, protectedPaths);

    return (
      <Box key={node.path}>
        <Box
          onClick={() =>
            node.isDirectory ? toggle(node.path) : onSelect(node.path)
          }
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            pl: `${8 + depth * 12}px`,
            pr: 1,
            py: 0.5,
            cursor: 'pointer',
            borderRadius: 1,
            bgcolor: isActive ? 'rgba(249,115,22,0.14)' : 'transparent',
            '&:hover': {
              bgcolor: isActive
                ? 'rgba(249,115,22,0.18)'
                : 'rgba(255,255,255,0.04)',
            },
          }}
        >
          {node.isDirectory ? (
            isCollapsed ? (
              <ChevronRight size={14} />
            ) : (
              <ChevronDown size={14} />
            )
          ) : (
            <FileIcon size={13} opacity={0.6} />
          )}
          <Typography
            sx={{
              fontFamily: fontFamilyMono,
              fontSize: 12.5,
              color: isActive ? '#f97316' : 'text.primary',
              opacity: isLocked ? 0.55 : 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {node.name}
          </Typography>
          {/* Unsaved work is the one thing a student must never lose track of. */}
          {isDirty && (
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: '#fbbf24',
                flexShrink: 0,
              }}
            />
          )}
          {isLocked && <Lock size={11} opacity={0.5} />}
        </Box>

        {node.isDirectory &&
          !isCollapsed &&
          node.children.map(child => renderNode(child, depth + 1))}
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

  return <Box sx={{ py: 1 }}>{root.map(node => renderNode(node, 0))}</Box>;
};

/** Turns `src/a/b.rs` paths into nested nodes, directories before files. */
function buildTree(entries: RepoTreeEntryResponse[]): TreeNode[] {
  const root: TreeNode[] = [];
  const directories = new Map<string, TreeNode>();

  const ensureDirectory = (path: string): TreeNode[] => {
    if (path === '') return root;

    const existing = directories.get(path);
    if (existing) return existing.children;

    const separator = path.lastIndexOf('/');
    const parent = ensureDirectory(
      separator === -1 ? '' : path.slice(0, separator)
    );
    const node: TreeNode = {
      name: separator === -1 ? path : path.slice(separator + 1),
      path,
      isDirectory: true,
      children: [],
    };
    directories.set(path, node);
    parent.push(node);
    return node.children;
  };

  for (const entry of entries) {
    if (entry.type === 'tree') {
      ensureDirectory(entry.path);
      continue;
    }
    const separator = entry.path.lastIndexOf('/');
    const siblings = ensureDirectory(
      separator === -1 ? '' : entry.path.slice(0, separator)
    );
    siblings.push({
      name: separator === -1 ? entry.path : entry.path.slice(separator + 1),
      path: entry.path,
      isDirectory: false,
      children: [],
    });
  }

  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) =>
      a.isDirectory === b.isDirectory
        ? a.name.localeCompare(b.name)
        : a.isDirectory
          ? -1
          : 1
    );
    nodes.forEach(node => node.isDirectory && sort(node.children));
  };
  sort(root);

  return root;
}

/**
 * Mirrors the backend's matcher so locked files look locked before a save is
 * attempted. The backend remains authoritative — this is only presentation.
 */
function matchesAny(path: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    const source = escaped
      .split('**')
      .map(part => part.replace(/\*/g, '[^/]*'))
      .join('.*');
    return new RegExp(`^${source}$`).test(path);
  });
}
