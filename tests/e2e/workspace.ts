import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export function e2eRoot(): string {
  const root = process.env.LOOPBOARD_E2E_ROOT;
  if (!root) throw new Error('LOOPBOARD_E2E_ROOT is not set — run through playwright.config.ts');
  return root;
}

// The demo workspace's `.agents/` root.
export function workspaceRoot(): string {
  return join(e2eRoot(), 'demo-repo', '.agents');
}

export function readIssueFile(filename: string): Promise<string> {
  return readFile(join(workspaceRoot(), 'issues', filename), 'utf8');
}

export function writeIssueFile(filename: string, contents: string): Promise<void> {
  return writeFile(join(workspaceRoot(), 'issues', filename), contents, 'utf8');
}
