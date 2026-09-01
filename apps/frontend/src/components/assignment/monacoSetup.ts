// The editor API only — deliberately not the `monaco-editor` barrel, which
// drags in the TypeScript, CSS and HTML language services and their multi-MB
// workers. We ship syntax highlighting and nothing else (no LSP), so the
// Monarch grammars in basic-languages are the whole language story.
//
// Specifiers here omit `esm/vs`: monaco-editor's exports map rewrites `./x` to
// `./esm/vs/x.js`, so spelling the real path out fails to resolve.
import * as monaco from 'monaco-editor/editor/editor.api';
import 'monaco-editor/basic-languages/monaco.contribution';
import editorWorker from 'monaco-editor/editor/editor.worker?worker';
import { loader } from '@monaco-editor/react';

/**
 * Serves Monaco from our own bundle instead of the jsDelivr CDN
 * `@monaco-editor/react` defaults to.
 *
 * This is not a preference about bundling. Under the no-GitHub-access design
 * the browser editor is the only way a student can touch their code for the
 * length of the cohort, so a third-party CDN being blocked or down would mean
 * nobody can work. That is not an acceptable dependency for the critical path.
 *
 * Imported for its side effects by the editor page only, which is lazy-loaded,
 * so none of this reaches any other route's bundle.
 */
declare global {
  interface Window {
    MonacoEnvironment?: monaco.Environment;
  }
}

// One worker for everything: with no language services there is nothing for a
// per-language worker to do.
self.MonacoEnvironment = {
  getWorker: () => new editorWorker(),
};

loader.config({ monaco });
