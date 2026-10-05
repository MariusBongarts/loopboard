import { describe, expect, it } from 'vitest';
import { editorUrl, issueEditorUrl } from '../src/editor';

describe('editorUrl', () => {
  it('builds vscode:// and cursor:// file links', () => {
    expect(editorUrl('vscode', '/Users/me/my app/.agents/issues/0001-a.md')).toBe('vscode://file/Users/me/my%20app/.agents/issues/0001-a.md');
    expect(editorUrl('cursor', '/repo/x.md')).toBe('cursor://file/repo/x.md');
    expect(editorUrl('none', '/repo/x.md')).toBeNull();
  });

  it('turns Windows paths into forward-slash file links', () => {
    expect(editorUrl('vscode', 'C:\\work\\repo\\x.md')).toBe('vscode://file/C:/work/repo/x.md');
  });

  it('points at the issue file, archived or not', () => {
    const issue = { filename: '0007-fix.md', archived: false };
    expect(issueEditorUrl('vscode', '/repo/.agents/', issue)).toBe('vscode://file/repo/.agents/issues/0007-fix.md');
    expect(issueEditorUrl('vscode', '/repo/.agents', { ...issue, archived: true })).toBe('vscode://file/repo/.agents/issues/_archive/0007-fix.md');
    expect(issueEditorUrl('vscode', '', issue)).toBeNull();
  });
});
