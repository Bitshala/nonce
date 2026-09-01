import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  ThemeProvider,
  Typography,
} from '@mui/material';
import Editor from '@monaco-editor/react';
// Side-effect import: points Monaco at our bundle rather than a CDN.
import '../../components/assignment/monacoSetup.ts';
import { ArrowLeft, Download, Play, Save } from 'lucide-react';
import { isAxiosError } from 'axios';
import type {
  CommitConflictResponse,
  RepoFileResponse,
} from '@nonce/shared';
import { CIRunStatus } from '@nonce/shared';
import {
  fellowshipDarkTheme,
  fontFamilyMono,
} from '../../components/fellowship/theme.ts';
import { FileTree } from '../../components/assignment/FileTree.tsx';
import { RunPanel } from '../../components/assignment/RunPanel.tsx';
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

  const { data: assignment, isError, error } = useAssignment(
    assignmentId ?? '',
    { enabled: !!assignmentId }
  );
  const submission = assignment?.submission ?? null;

  const [baseCommitSha, setBaseCommitSha] = useState<string | null>(null);
  const [openFiles, setOpenFiles] = useState<Map<string, OpenFile>>(new Map());
  const [activePath, setActivePath] = useState<string | null>(null);
  const [conflict, setConflict] = useState<CommitConflictResponse | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const { data: tree, refetch: refetchTree } = useSubmissionTree(
    { submissionId: submission?.id ?? '' },
    { enabled: !!submission?.id }
  );

  const commit = useCommit();
  const createRun = useCreateRun();
  const saveDraft = useSaveDraft();

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
    async (path: string) => {
      setActivePath(path);
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

  const save = useCallback(async (): Promise<string | null> => {
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
          next.set(file.path, { ...file, original: file.content });
        }
        return next;
      });
      void refetchTree();
      return result.commitSha;
    } catch (saveError) {
      if (isAxiosError(saveError) && saveError.response?.status === 409) {
        setConflict(saveError.response.data as CommitConflictResponse);
      } else {
        setBanner(extractErrorMessage(saveError));
      }
      return null;
    }
  }, [submission?.id, baseCommitSha, openFiles, commit, refetchTree]);

  // Run always targets an explicit commit, so an unsaved editor saves first.
  const run_ = async () => {
    if (!submission?.id) return;
    const sha = await save();
    if (!sha) return;

    try {
      const dispatched = await createRun.mutateAsync({
        submissionId: submission.id,
        commitSha: sha,
      });
      setActiveRunId(dispatched.id);
    } catch (runError) {
      setBanner(extractErrorMessage(runError));
    }
  };

  /** Discards local edits and reloads from the branch head. */
  const reloadFromServer = () => {
    setConflict(null);
    setOpenFiles(new Map());
    setActivePath(null);
    void refetchTree();
  };

  if (isError) {
    return (
      <Shell>
        <Alert severity="error" sx={{ m: 3 }}>
          {extractErrorMessage(error)}
        </Alert>
      </Shell>
    );
  }

  if (!assignment || !submission) {
    return (
      <Shell>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
          <CircularProgress />
        </Box>
      </Shell>
    );
  }

  const isSaving = commit.isPending;
  const isRunning =
    createRun.isPending || (!!run && !isTerminal(run.status));

  return (
    <Shell>
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 2,
            py: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
            flexShrink: 0,
          }}
        >
          <Button
            size="small"
            startIcon={<ArrowLeft size={15} />}
            onClick={() => navigate(`/assignments/${assignment.id}`)}
            sx={{ color: 'text.secondary' }}
          >
            Back
          </Button>

          <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>
            {assignment.title ?? assignment.slug}
          </Typography>

          {dirtyPaths.size > 0 && (
            <Chip
              size="small"
              label={`${dirtyPaths.size} unsaved`}
              sx={{ height: 20, fontSize: 11 }}
            />
          )}

          <Box sx={{ flex: 1 }} />

          <Button
            size="small"
            startIcon={<Download size={15} />}
            href={assignmentService.downloadArchiveUrl(submission.id)}
            sx={{ color: 'text.secondary' }}
          >
            Export
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Save size={15} />}
            disabled={isSaving || dirtyPaths.size === 0}
            onClick={() => void save()}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<Play size={15} />}
            disabled={isRunning}
            onClick={() => void run_()}
          >
            {isRunning ? 'Running…' : 'Run'}
          </Button>
        </Box>

        {banner && (
          <Alert severity="error" onClose={() => setBanner(null)}>
            {banner}
          </Alert>
        )}

        <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <Box
            sx={{
              width: 260,
              flexShrink: 0,
              borderRight: '1px solid',
              borderColor: 'divider',
              overflow: 'auto',
            }}
          >
            <FileTree
              entries={tree?.entries ?? []}
              activePath={activePath}
              dirtyPaths={dirtyPaths}
              protectedPaths={assignment.protectedPaths}
              onSelect={path => void openFile(path)}
            />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0, display: 'flex' }}>
            {activeFile ? (
              <Editor
                theme="vs-dark"
                path={activeFile.path}
                language={languageOf(activeFile.path)}
                value={activeFile.content}
                onChange={onEdit}
                options={{
                  readOnly: !activeFile.editable,
                  fontFamily: fontFamilyMono,
                  fontSize: 13,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 4,
                }}
              />
            ) : (
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography
                  sx={{ fontSize: 13, color: 'text.secondary' }}
                >
                  Select a file to start editing.
                </Typography>
              </Box>
            )}
          </Box>

          <Box
            sx={{
              width: 380,
              flexShrink: 0,
              borderLeft: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}
          >
            <RunPanel
              run={run}
              logs={runLogs?.content}
              isDispatching={createRun.isPending}
            />
          </Box>
        </Box>
      </Box>

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
    </Shell>
  );
};

/** Rendered outside the app Layout: the editor wants the whole viewport. */
const Shell = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={fellowshipDarkTheme}>
    <CssBaseline />
    {children}
  </ThemeProvider>
);

function isTerminal(status: CIRunStatus): boolean {
  return (
    status === CIRunStatus.COMPLETED || status === CIRunStatus.ORPHANED
  );
}

/** Monaco needs a language id; the extension is the only hint we have. */
function languageOf(path: string): string {
  const extension = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
  const byExtension: Record<string, string> = {
    rs: 'rust',
    py: 'python',
    cpp: 'cpp',
    cc: 'cpp',
    cxx: 'cpp',
    h: 'cpp',
    hpp: 'cpp',
    c: 'c',
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
  return byExtension[extension] ?? 'plaintext';
}

export default AssignmentEditorPage;
