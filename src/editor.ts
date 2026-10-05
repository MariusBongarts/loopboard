import { ref } from 'vue';
import { readStored, writeStored } from './storage';
import type { Issue } from './types';

// Which editor "Open in editor" targets (#0049) — per browser, like the theme.
export const EDITORS = ['none', 'vscode', 'cursor'] as const;
export type EditorChoice = (typeof EDITORS)[number];
export const EDITOR_LABEL: Record<EditorChoice, string> = { none: 'None', vscode: 'VS Code', cursor: 'Cursor' };

const KEY = 'loopboard.editor';

function readChoice(): EditorChoice {
  const v = readStored(KEY);
  return EDITORS.find((e) => e === v) ?? 'none';
}

export const editorChoice = ref<EditorChoice>(readChoice());

export function setEditor(choice: EditorChoice): void {
  editorChoice.value = choice;
  writeStored(KEY, choice === 'none' ? null : choice);
}

// `vscode://file/<absolute path>`; Windows paths get forward slashes and a
// leading slash, as both editors expect.
export function editorUrl(choice: EditorChoice, absPath: string): string | null {
  if (choice === 'none') return null;
  let path = absPath.replace(/\\/g, '/');
  if (!path.startsWith('/')) path = `/${path}`;
  return `${choice}://file${encodeURI(path)}`;
}

export function issueEditorUrl(choice: EditorChoice, root: string, issue: Pick<Issue, 'filename' | 'archived'>): string | null {
  if (!root) return null;
  return editorUrl(choice, `${root.replace(/[\\/]+$/, '')}/issues/${issue.archived ? '_archive/' : ''}${issue.filename}`);
}
