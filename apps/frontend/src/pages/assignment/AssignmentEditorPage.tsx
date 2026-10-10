import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { alpha, type Theme } from '@mui/material/styles';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  Alert,
  Chip,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Collapse,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import Editor from '@monaco-editor/react';
// Side-effect import: points Monaco at our bundle rather than a CDN.
import '../../components/assignment/monacoSetup.ts';
import { isAxiosError } from 'axios';
import type { CommitConflictResponse, RepoFileResponse } from '@nonce/shared';
import { fontFamilyMono } from '../../components/fellowship/theme.ts';
import { AssignmentTheme } from '../../components/assignment/AssignmentTheme.tsx';
import {
  describeOutput,
  isTerminal,
} from '../../components/assignment/runStatus.ts';
import { RailButton } from '../../components/assignment/RailButton.tsx';
import {
  workspaceBorder,
  workspacePalette,
} from '../../components/assignment/workspaceTheme.ts';
import { readStored, writeStored } from '../../utils/storage.ts';
import { FileTree } from '../../components/assignment/FileTree.tsx';
import { RunOutput, RunPanel } from '../../components/assignment/RunPanel.tsx';
import {
  belongsToLanguage,
  detectLanguages,
  fileRole,
  isBriefPath,
  languageLabel,
  languageName,
  languageOf,
} from '../../components/assignment/languages.ts';
import assignmentService from '../../services/assignmentService.ts';
import {
  useAssignment,
  useCommit,
  useCreateRun,
  useRun,
  useRunLogs,
  useSaveDraft,
  useSubmissionTree,
} from '../../hooks/assignmentHooks.ts';
import { extractErrorMessage } from '../../utils/errorUtils.ts';
import { usePageMeta } from '../../hooks/usePageMeta.ts';

/** Widths of the side panels: open, and the slim rail they collapse to. */
const PANEL_OPEN = { files: 232, checks: 340 };
const isMac =
  typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);

/** Debounce before an edit is mirrored to the server-side draft. */
const DRAFT_DEBOUNCE_MS = 1500;

/** Poll cadence while a run is live. The backend also rate-limits refreshes. */
const RUN_POLL_MS = 2500;

interface OpenFile {
  path: string;
  original: string;
  content: string;
  editable: boolean;
}

/**
 * The editor.
 *
 * Because students hold no GitHub credentials, this is not a convenience layer
 * over `git clone` — for the length of the cohort it is the only way to touch
 * the code. Save writes one commit; Run grades one commit.
 */
export const AssignmentEditorPage = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();

  const {
    data: assignment,
    isError,
    error,
  } = useAssignment(assignmentId ?? '', { enabled: !!assignmentId });
  const submission = assignment?.submission ?? null;

  const [baseCommitSha, setBaseCommitSha] = useState<string | null>(null);
  const [openFiles, setOpenFiles] = useState<Map<string, OpenFile>>(new Map());
  const [activePath, setActivePath] = useState<string | null>(null);
  const [conflict, setConflict] = useState<CommitConflictResponse | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [filesOpen, setFilesOpen] = useState(
    () => readStored('editor-files-open') !== 'false'
  );
  const [checksOpen, setChecksOpen] = useState(
    () => readStored('editor-checks-open') !== 'false'
  );
  const [languageChoice, setLanguageChoice] = useState<string | null>(() =>
    readStored('editor-language')
  );
  const [pendingClose, setPendingClose] = useState<string | null>(null);
  const [outputOpen, setOutputOpen] = useState(false);
  const [langAnchor, setLangAnchor] = useState<HTMLElement | null>(null);
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const [tabSize, setTabSize] = useState(4);
  // Which language the landing file was opened for, so closing every tab
  // leaves the editor empty instead of reopening the starter.
  const landedFor = useRef<string | null>(null);

  const { data: tree, refetch: refetchTree } = useSubmissionTree(
    { submissionId: submission?.id ?? '' },
    { enabled: !!submission?.id }
  );

  const commit = useCommit();
  const createRun = useCreateRun();
  const saveDraft = useSaveDraft();

  // Reopening the editor shows the last run rather than "not run".
  const latestRunId = submission?.latestRun?.id ?? null;
  useEffect(() => {
    if (latestRunId) setActiveRunId(current => current ?? latestRunId);
  }, [latestRunId]);

  const { data: run } = useRun(activeRunId ?? '', {
    enabled: !!activeRunId,
    // A live run needs frequent updates; a finished one needs none. Overrides
    // the 5-minute default staleTime, which is wrong for this shape of data.
    staleTime: 0,
    refetchInterval: query =>
      query.state.data && isTerminal(query.state.data.status)
        ? false
        : RUN_POLL_MS,
  });

  const { data: runLogs } = useRunLogs(activeRunId ?? '', {
    enabled: !!activeRunId && !!run?.hasLogs,
  });

  usePageMeta(assignment?.title ? `${assignment.title} — Editor` : 'Editor');

  // The tree resolves the ref to a commit; that SHA is the base every save
  // compare-and-swaps against.
  useEffect(() => {
    if (tree?.commitSha) setBaseCommitSha(tree.commitSha);
  }, [tree?.commitSha]);

  const activeFile = activePath ? openFiles.get(activePath) : undefined;
  const dirtyPaths = useMemo(
    () =>
      new Set(
        [...openFiles.values()]
          .filter(file => file.content !== file.original)
          .map(file => file.path)
      ),
    [openFiles]
  );

  const openFile = useCallback(
    async (path: string, activate = true) => {
      if (activate) setActivePath(path);
      if (openFiles.has(path) || !submission?.id) return;

      try {
        const file: RepoFileResponse = await assignmentService.getFile(
          submission.id,
          path,
          baseCommitSha ?? undefined
        );
        setOpenFiles(previous => {
          const next = new Map(previous);
          next.set(path, {
            path,
            original: file.content ?? '',
            content: file.content ?? '',
            editable: file.editable,
          });
          return next;
        });
      } catch (openError) {
        setBanner(extractErrorMessage(openError));
      }
    },
    [openFiles, submission?.id, baseCommitSha]
  );

  // The template keeps one folder per language; the selector picks which one
  // the student sees. Shared root files (README, grader files) stay visible.
  const protectedPaths = assignment?.protectedPaths;
  const languages = useMemo(
    () => detectLanguages(tree?.entries ?? [], protectedPaths ?? []),
    [tree?.entries, protectedPaths]
  );
  const language =
    languages.length === 0
      ? null
      : languages.includes(languageChoice ?? '')
        ? languageChoice
        : languages.includes('python')
          ? 'python'
          : languages[0];
  const inView = useCallback(
    (path: string) =>
      isBriefPath(path) || belongsToLanguage(path, language, languages),
    [language, languages]
  );

  const chooseLanguage = (next: string) => {
    const hidden = [...dirtyPaths].some(
      path => !isBriefPath(path) && !belongsToLanguage(path, next, languages)
    );
    if (hidden) {
      setBanner('Save your changes before switching language.');
      return;
    }
    setLanguageChoice(next);
    writeStored('editor-language', next);
    // Drop focus so the landing effect opens the new language's starter file.
    setActivePath(null);
  };

  // Land in the student's answer file rather than on a blank "select a file" state. Runs again after a language switch.
  useEffect(() => {
    if (!tree?.entries.length) return;
    if (landedFor.current === (language ?? '')) return;
    landedFor.current = language ?? '';
    const files = tree.entries
      .filter(entry => entry.type === 'blob')
      .map(entry => entry.path)
      .sort()
      .filter(inView);
    // The answer file first, then anything the student can edit.
    const rank = (path: string) =>
      ({ answer: 0, provided: 1, other: 2, grader: 3 })[
        fileRole(path, protectedPaths ?? [])
      ];
    const starter =
      files
        .filter(path => !isBriefPath(path))
        .sort((x, y) => rank(x) - rank(y) || x.localeCompare(y))[0] ?? files[0];
    if (starter) void openFile(starter);
  }, [tree, openFile, inView, language, protectedPaths]);

  const closeFile = (path: string) => {
    const tabs = [...openFiles.keys()].filter(inView);
    const index = tabs.indexOf(path);
    setOpenFiles(previous => {
      const next = new Map(previous);
      next.delete(path);
      return next;
    });
    if (activePath === path) {
      setActivePath(tabs[index + 1] ?? tabs[index - 1] ?? null);
    }
  };
  // Unsaved edits are the one thing a close must not silently throw away.
  const requestClose = (path: string) =>
    dirtyPaths.has(path) ? setPendingClose(path) : closeFile(path);

  const onEdit = (value: string | undefined) => {
    if (!activePath || value === undefined || !submission?.id) return;

    setOpenFiles(previous => {
      const next = new Map(previous);
      const file = next.get(activePath);
      if (file) next.set(activePath, { ...file, content: value });
      return next;
    });

    // Autosave is a crash-safety net that runs alongside, not instead of, Save.
    saveDraft.debouncedMutate(
      { submissionId: submission.id, path: activePath, content: value },
      DRAFT_DEBOUNCE_MS
    );
  };

  // Synchronous guards: `isPending` only updates on the next render, so a held
  // Cmd+Enter fires several saves before it does, all on the same base, and
  // every one after the first comes back as a spurious conflict.
  const pendingSave = useRef<Promise<string | null> | null>(null);
  const runStarting = useRef(false);

  /** One save at a time; a call while one is in flight shares its result. */
  const save = (): Promise<string | null> => {
    if (pendingSave.current) return pendingSave.current;
    const attempt = saveOnce().finally(() => {
      pendingSave.current = null;
    });
    pendingSave.current = attempt;
    return attempt;
  };

  const saveOnce = async (): Promise<string | null> => {
    if (!submission?.id || !baseCommitSha) return null;

    const changed = [...openFiles.values()].filter(
      file => file.content !== file.original
    );
    if (changed.length === 0) return baseCommitSha;

    try {
      const result = await commit.mutateAsync({
        submissionId: submission.id,
        body: {
          baseCommitSha,
          message: 'Save from editor',
          // Only dirty files are sent; the tree keeps everything else.
          files: changed.map(file => ({
            path: file.path,
            content: file.content,
            encoding: 'utf-8' as const,
          })),
        },
      });

      setBaseCommitSha(result.commitSha);
      setOpenFiles(previous => {
        const next = new Map(previous);
        for (const file of changed) {
          // Keep `content`: keystrokes typed while the request was in flight.
          const current = previous.get(file.path);
          if (current)
            next.set(file.path, { ...current, original: file.content });
        }
        return next;
      });
      void refetchTree();
      return result.commitSha;
    } catch (saveError) {
      // 409 also means "repository not ready", so only a body that is a
      // commit conflict opens the conflict dialog.
      const body: unknown = isAxiosError(saveError)
        ? saveError.response?.data
        : undefined;
      if (
        isAxiosError(saveError) &&
        saveError.response?.status === 409 &&
        isCommitConflict(body)
      ) {
        setConflict(body);
      } else {
        setBanner(extractErrorMessage(saveError));
      }
      return null;
    }
  };

  // Run always targets an explicit commit, so an unsaved editor saves first.
  const run_ = async () => {
    if (!submission?.id || createRun.isPending || runStarting.current) return;
    if (!assignment?.isOpenForSubmission) return;
    if (run && !isTerminal(run.status)) return;
    if (conflict || pendingClose) return;
    runStarting.current = true;
    try {
      setOutputOpen(true);
      const sha = await save();
      if (!sha) return;

      const dispatched = await createRun.mutateAsync({
        submissionId: submission.id,
        commitSha: sha,
      });
      setActiveRunId(dispatched.id);
    } catch (runError) {
      setBanner(extractErrorMessage(runError));
    } finally {
      runStarting.current = false;
    }
  };

  // Cmd/Ctrl+Enter runs the checks from anywhere, including inside Monaco.
  const runRef = useRef(run_);
  runRef.current = run_;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        void runRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /** Discards local edits and reloads from the branch head. */
  const reloadFromServer = () => {
    // Read from where the branch is now. The landing file reopens before the
    // tree refetch lands, and a copy read at the old base would be saved
    // straight back over the other change, which the CAS cannot catch.
    if (conflict) setBaseCommitSha(conflict.currentCommitSha);
    setConflict(null);
    setOpenFiles(new Map());
    setActivePath(null);
    landedFor.current = null;
    void refetchTree();
  };

  if (isError) {
    return (
      <AssignmentTheme baseline>
        <Box sx={{ p: 3 }}>
          <Typography color="error">{extractErrorMessage(error)}</Typography>
        </Box>
      </AssignmentTheme>
    );
  }

  if (!assignment || !submission) {
    return (
      <AssignmentTheme baseline>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
          <CircularProgress />
        </Box>
      </AssignmentTheme>
    );
  }

  const isSaving = commit.isPending;
  // Closed, or past a deadline that takes no late work: the API refuses
  // saves and runs, so the editor says so up front instead of on a 403.
  const isLocked = !assignment.isOpenForSubmission;
  const isRunning = createRun.isPending || (!!run && !isTerminal(run.status));
  const statusChip = assignment.isPastDeadline
    ? { label: 'Past due', color: 'warning' as const }
    : assignment.isOpenForSubmission
      ? { label: 'Open', color: 'success' as const }
      : { label: 'Closed', color: 'default' as const };
  const saveLabel = isSaving
    ? 'Saving…'
    : dirtyPaths.size > 0
      ? 'Unsaved changes'
      : 'Saved';
  const tabs = [...openFiles.keys()].filter(inView);
  const role = activePath
    ? fileRole(activePath, assignment.protectedPaths)
    : null;
  const crumbs = activePath
    ? (language && activePath.startsWith(`${language}/`)
        ? activePath.slice(language.length + 1)
        : activePath
      ).split('/')
    : [];
  const brief = tree?.entries.find(
    entry => entry.type === 'blob' && isBriefPath(entry.path)
  )?.path;
  const activeLanguage = language
    ? languageName(language)
    : languageLabel(activePath);
  const rolePill: Record<string, string> = {
    answer: 'Your answer',
    provided: 'Provided helper',
    grader: 'Grader file · read-only',
  };

  const setPanel = (key: 'files' | 'checks', open: boolean) => {
    (key === 'files' ? setFilesOpen : setChecksOpen)(open);
    writeStored(
      key === 'files' ? 'editor-files-open' : 'editor-checks-open',
      String(open)
    );
  };

  return (
    <AssignmentTheme baseline>
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          bgcolor: 'workspace.bg',
        }}
      >
        {/* Top bar */}
        <Box
          sx={{
            height: 52,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            pl: 1.5,
            pr: 1.75,
            borderBottom: workspaceBorder('line'),
          }}
        >
          <Tooltip title="Back to assignments">
            <IconButton
              aria-label="Back to assignments"
              onClick={() => navigate('/assignments')}
              sx={{ color: 'workspace.muted' }}
            >
              <ChevronLeftIcon />
            </IconButton>
          </Tooltip>
          <Chip
            size="small"
            label={`W${assignment.weekNumber}`}
            sx={{
              fontFamily: fontFamilyMono,
              fontSize: 12,
              fontWeight: 500,
              height: 26,
              borderRadius: '6px',
              bgcolor: 'workspace.chip',
              color: 'workspace.muted',
            }}
          />
          <Typography
            noWrap
            sx={{ fontSize: 15, fontWeight: 700, minWidth: 0 }}
          >
            {assignment.title ?? assignment.slug}
          </Typography>
          <Chip
            size="small"
            label={statusChip.label}
            sx={theme => {
              const tone =
                statusChip.color === 'default'
                  ? null
                  : theme.palette[statusChip.color].main;
              return {
                flexShrink: 0,
                height: 22,
                fontSize: 12,
                fontWeight: 700,
                bgcolor: tone ? alpha(tone, 0.14) : 'workspace.chip',
                color: tone ?? 'workspace.muted',
              };
            }}
          />

          <Box sx={{ flex: 1 }} />

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              color: 'workspace.muted',
              mr: 0.5,
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor:
                  dirtyPaths.size > 0 || isSaving
                    ? 'warning.main'
                    : 'success.main',
              }}
            />
            <Typography sx={{ fontSize: 13 }}>{saveLabel}</Typography>
          </Box>

          <IconButton
            aria-label="More actions"
            onClick={event => setMenuAnchor(event.currentTarget)}
            sx={{ color: 'workspace.muted' }}
          >
            <MoreHorizIcon fontSize="small" />
          </IconButton>
          <Menu
            anchorEl={menuAnchor}
            open={!!menuAnchor}
            onClose={() => setMenuAnchor(null)}
          >
            <MenuItem
              disabled={isLocked || isSaving || dirtyPaths.size === 0}
              onClick={() => {
                setMenuAnchor(null);
                void save();
              }}
            >
              <ListItemIcon>
                <SaveOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>{isSaving ? 'Saving…' : 'Save'}</ListItemText>
            </MenuItem>
            <MenuItem
              component="a"
              href={assignmentService.downloadArchiveUrl(submission.id)}
              onClick={() => setMenuAnchor(null)}
            >
              <ListItemIcon>
                <DownloadIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Download .zip</ListItemText>
            </MenuItem>
          </Menu>

          <Button
            variant="contained"
            color="primary"
            startIcon={<PlayArrowIcon />}
            disabled={isLocked || isRunning}
            onClick={() => void run_()}
            sx={{
              flexShrink: 0,
              height: 36,
              pl: 1.75,
              pr: 1.25,
              fontSize: 13.5,
              borderRadius: '8px',
              bgcolor: 'workspace.accent',
              color: 'workspace.accentInk',
              fontWeight: 700,
              '&:hover': { bgcolor: 'workspace.accentHover' },
              '&.Mui-disabled': {
                bgcolor: (theme: Theme) =>
                  alpha(theme.palette.workspace.accent, 0.4),
                color: (theme: Theme) =>
                  alpha(theme.palette.workspace.accentInk, 0.7),
              },
            }}
          >
            {isRunning ? 'Running…' : 'Run checks'}
            <Box
              component="kbd"
              sx={{
                ml: 1.25,
                px: 0.75,
                borderRadius: '5px',
                bgcolor: 'rgba(28,15,5,0.16)',
                fontFamily: 'inherit',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {isMac ? '⌘↵' : 'Ctrl↵'}
            </Box>
          </Button>
        </Box>

        {banner && (
          <Alert
            severity="error"
            variant="outlined"
            sx={{ borderRadius: 0, cursor: 'pointer', py: 0 }}
            onClick={() => setBanner(null)}
          >
            {banner} (dismiss)
          </Alert>
        )}

        {/* Body: icon rail | files | editor + output | checks */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'grid',
            gridTemplateColumns: `48px ${filesOpen ? PANEL_OPEN.files : 0}px minmax(0, 1fr) ${checksOpen ? PANEL_OPEN.checks : 0}px`,
            transition: 'grid-template-columns 180ms ease',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.5,
              pt: 1,
              borderRight: workspaceBorder('line'),
            }}
          >
            <RailButton
              label={filesOpen ? 'Hide files' : 'Show files'}
              active={filesOpen}
              onClick={() => setPanel('files', !filesOpen)}
              icon={<FolderOutlinedIcon fontSize="small" />}
            />
            <RailButton
              label="Open the brief"
              active={!!brief && activePath === brief}
              disabled={!brief}
              onClick={() => brief && void openFile(brief)}
              icon={<MenuBookOutlinedIcon fontSize="small" />}
            />
            <RailButton
              label={checksOpen ? 'Hide checks' : 'Show checks'}
              active={checksOpen}
              onClick={() => setPanel('checks', !checksOpen)}
              icon={<CheckCircleOutlineIcon fontSize="small" />}
            />
          </Box>

          <Box
            sx={{
              minWidth: 0,
              minHeight: 0,
              overflow: 'hidden',
              borderRight: filesOpen ? workspaceBorder('line') : 'none',
            }}
          >
            <Box sx={{ width: PANEL_OPEN.files, height: '100%' }}>
              <FileTree
                entries={tree?.entries ?? []}
                activePath={activePath}
                dirtyPaths={dirtyPaths}
                protectedPaths={assignment.protectedPaths}
                onSelect={path => void openFile(path)}
                language={language}
                languages={languages}
              />
            </Box>
          </Box>

          {/* Editor column */}
          <Box
            sx={{
              minWidth: 0,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {tabs.length > 0 && (
              <Tabs
                value={
                  activeFile && tabs.includes(activePath!) ? activePath : false
                }
                onChange={(_, path: string) => setActivePath(path)}
                variant="scrollable"
                scrollButtons={false}
                slotProps={{
                  indicator: {
                    sx: {
                      top: 0,
                      bottom: 'auto',
                      height: 2,
                      bgcolor: 'workspace.accent',
                    },
                  },
                }}
                sx={{
                  minHeight: 38,
                  flexShrink: 0,
                  borderBottom: workspaceBorder('line'),
                }}
              >
                {tabs.map(path => (
                  <Tab
                    key={path}
                    value={path}
                    label={
                      path.slice(path.lastIndexOf('/') + 1) +
                      (dirtyPaths.has(path) ? ' •' : '')
                    }
                    iconPosition="end"
                    // A span, not a button: a Tab is already one, and buttons can't nest.
                    icon={
                      <Box
                        component="span"
                        aria-hidden
                        onClick={event => {
                          event.stopPropagation();
                          requestClose(path);
                        }}
                        sx={{
                          display: 'inline-flex',
                          p: '2px',
                          ml: 0.75,
                          borderRadius: '4px',
                          color: 'workspace.muted',
                          '&:hover': {
                            bgcolor: 'action.hover',
                            color: 'common.white',
                          },
                        }}
                      >
                        <CloseIcon sx={{ fontSize: 13 }} />
                      </Box>
                    }
                    onKeyDown={event => {
                      if (event.key === 'Delete' || event.key === 'Backspace') {
                        event.preventDefault();
                        requestClose(path);
                      }
                    }}
                    // Middle-click closes, as in every editor.
                    onAuxClick={event => {
                      if (event.button === 1) requestClose(path);
                    }}
                    sx={{
                      minHeight: 38,
                      minWidth: 0,
                      fontFamily: fontFamilyMono,
                      fontSize: 12.5,
                      fontWeight: 500,
                      pl: 2,
                      pr: 1.25,
                      color: 'workspace.muted',
                      borderRight: workspaceBorder('line'),
                      '&.Mui-selected': {
                        color: 'common.white',
                        bgcolor: 'workspace.bg',
                      },
                    }}
                  />
                ))}
              </Tabs>
            )}

            {activeFile && (
              <Box
                sx={{
                  height: 32,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 2,
                  fontFamily: fontFamilyMono,
                  fontSize: 12,
                  color: 'workspace.muted',
                }}
              >
                {language && <span>{language}</span>}
                {language && <ChevronRightIcon sx={{ fontSize: 14 }} />}
                {crumbs.map((part, i) => (
                  <Box
                    component="span"
                    key={i}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 1,
                      color:
                        i === crumbs.length - 1
                          ? 'text.primary'
                          : 'workspace.muted',
                    }}
                  >
                    {part}
                    {i < crumbs.length - 1 && (
                      <ChevronRightIcon sx={{ fontSize: 14 }} />
                    )}
                  </Box>
                ))}
                {role && rolePill[role] && (
                  <Chip
                    size="small"
                    label={rolePill[role]}
                    sx={{
                      height: 20,
                      fontSize: 11,
                      fontWeight: 700,
                      bgcolor: '#26262b',
                      color: 'workspace.muted',
                      fontFamily: 'Inter, sans-serif',
                      ml: 0.5,
                    }}
                  />
                )}
              </Box>
            )}

            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                minWidth: 0,
                overflow: 'hidden',
                bgcolor: 'workspace.bg',
              }}
            >
              {activeFile ? (
                <Editor
                  height="100%"
                  theme="nonce-dark"
                  beforeMount={monaco =>
                    monaco.editor.defineTheme('nonce-dark', {
                      base: 'vs-dark',
                      inherit: true,
                      rules: [
                        { token: 'comment', foreground: '6b6b73' },
                        { token: 'keyword', foreground: '6cb2ff' },
                        { token: 'string', foreground: '4fd6a0' },
                        { token: 'number', foreground: 'f2c35b' },
                        { token: 'attribute.name', foreground: 'f2c35b' },
                        { token: 'variable', foreground: 'e6e6ea' },
                        { token: 'metatag', foreground: 'e6e6ea' },
                        { token: 'comment.shebang', foreground: 'e6e6ea' },
                      ],
                      colors: {
                        'editor.background': workspacePalette.bg,
                        'editorGutter.background': workspacePalette.bg,
                        'editorLineNumber.foreground': '#55555c',
                        'editorLineNumber.activeForeground': '#ffffff',
                        'editor.lineHighlightBackground': '#ffffff0d',
                        'editor.lineHighlightBorder': '#00000000',
                      },
                    })
                  }
                  onMount={editor => {
                    editor.onDidChangeCursorPosition(event =>
                      setCursor({
                        line: event.position.lineNumber,
                        col: event.position.column,
                      })
                    );
                    setTabSize(editor.getModel()?.getOptions().tabSize ?? 4);
                  }}
                  path={activeFile.path}
                  language={languageOf(activeFile.path)}
                  value={activeFile.content}
                  onChange={onEdit}
                  options={{
                    readOnly: isLocked || !activeFile.editable,
                    fontFamily: fontFamilyMono,
                    fontSize: 13.5,
                    lineHeight: 22,
                    padding: { top: 8 },
                    lineNumbersMinChars: 5,
                    lineDecorationsWidth: 16,
                    folding: false,
                    bracketPairColorization: { enabled: false },
                    matchBrackets: 'never',
                    guides: { indentation: false, bracketPairs: false },
                    glyphMargin: false,
                    renderLineHighlight: 'all',
                    overviewRulerLanes: 0,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 4,
                  }}
                />
              ) : (
                <Box
                  sx={{
                    height: '100%',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 13,
                    color: 'text.secondary',
                  }}
                >
                  {tree?.entries.length
                    ? 'Select a file to start editing.'
                    : 'This repository is empty.'}
                </Box>
              )}
            </Box>

            {/* Output */}
            <Box
              sx={{
                flexShrink: 0,
                borderTop: workspaceBorder('line'),
                bgcolor: 'workspace.bg',
              }}
            >
              <Box
                role="button"
                tabIndex={0}
                aria-expanded={outputOpen}
                onClick={() => setOutputOpen(open => !open)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setOutputOpen(open => !open);
                  }
                }}
                sx={{
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 2,
                  cursor: 'pointer',
                }}
              >
                <Typography
                  sx={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: 'workspace.muted',
                  }}
                >
                  OUTPUT
                </Typography>
                <Typography
                  sx={{ fontSize: 12.5, color: 'workspace.muted', flex: 1 }}
                >
                  {describeOutput(run, createRun.isPending)}
                </Typography>
                <ExpandLessIcon
                  sx={{
                    fontSize: 18,
                    color: 'workspace.muted',
                    transition: 'transform .2s',
                    transform: outputOpen ? 'rotate(180deg)' : 'none',
                  }}
                />
              </Box>
              <Collapse in={outputOpen} unmountOnExit>
                <Box sx={{ maxHeight: 240, overflowY: 'auto' }}>
                  <RunOutput
                    run={run}
                    logs={runLogs?.content}
                    isDispatching={createRun.isPending}
                  />
                </Box>
              </Collapse>
            </Box>
          </Box>

          <Box
            sx={{
              minWidth: 0,
              minHeight: 0,
              overflow: 'hidden',
              borderLeft: checksOpen ? workspaceBorder('line') : 'none',
            }}
          >
            <Box sx={{ width: PANEL_OPEN.checks, height: '100%' }}>
              <RunPanel
                run={run}
                isDispatching={createRun.isPending}
                checks={assignment.exercise?.expectedOutput}
              />
            </Box>
          </Box>
        </Box>

        {/* Status bar */}
        <Box
          sx={{
            height: 26,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            px: 1.5,
            borderTop: workspaceBorder('line'),
            fontSize: 12,
            color: 'workspace.muted',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: 'success.main',
              }}
            />
            Workspace ready
          </Box>
          <Tooltip title={languages.length > 1 ? 'Change language' : ''}>
            <Box
              component="button"
              type="button"
              disabled={languages.length < 2}
              onClick={event => setLangAnchor(event.currentTarget)}
              sx={{
                all: 'unset',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.25,
                cursor: languages.length > 1 ? 'pointer' : 'default',
                '&:hover':
                  languages.length > 1 ? { color: 'common.white' } : {},
              }}
            >
              {activeLanguage}
              {languages.length > 1 && <ExpandMoreIcon sx={{ fontSize: 14 }} />}
            </Box>
          </Tooltip>
          <Menu
            anchorEl={langAnchor}
            open={!!langAnchor}
            onClose={() => setLangAnchor(null)}
          >
            {languages.map(dir => (
              <MenuItem
                key={dir}
                selected={dir === language}
                onClick={() => {
                  setLangAnchor(null);
                  chooseLanguage(dir);
                }}
              >
                {languageName(dir)}
              </MenuItem>
            ))}
          </Menu>
          <Box sx={{ flex: 1 }} />
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              fontFamily: fontFamilyMono,
              fontSize: 11.5,
            }}
          >
            <span>
              Ln {cursor.line}, Col {cursor.col}
            </span>
            <span>Spaces: {tabSize}</span>
            <span>UTF-8</span>
          </Box>
        </Box>
      </Box>

      <Dialog open={!!pendingClose} onClose={() => setPendingClose(null)}>
        <DialogTitle>Close without saving?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: 13.5 }}>
            {pendingClose?.slice(pendingClose.lastIndexOf('/') + 1)} has changes
            that are not saved. Closing it discards them.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingClose(null)}>Keep editing</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (pendingClose) closeFile(pendingClose);
              setPendingClose(null);
            }}
          >
            Discard and close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!conflict} onClose={() => setConflict(null)}>
        <DialogTitle>This file changed elsewhere</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: 13.5 }}>
            Your workspace moved on since you opened it, so your save was not
            applied. Reload to pick up the current version — your unsaved edits
            will be discarded.
          </DialogContentText>
          {conflict && conflict.changedPaths.length > 0 && (
            <Box
              component="pre"
              sx={{
                fontFamily: fontFamilyMono,
                fontSize: 11.5,
                mt: 1.5,
                whiteSpace: 'pre-wrap',
              }}
            >
              {conflict.changedPaths.join('\n')}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConflict(null)}>Keep editing</Button>
          <Button variant="contained" onClick={reloadFromServer}>
            Reload
          </Button>
        </DialogActions>
      </Dialog>
    </AssignmentTheme>
  );
};

export default AssignmentEditorPage;

function isCommitConflict(body: unknown): body is CommitConflictResponse {
  const candidate = body as Partial<CommitConflictResponse> | null;
  return (
    typeof candidate?.currentCommitSha === 'string' &&
    Array.isArray(candidate.changedPaths)
  );
}
