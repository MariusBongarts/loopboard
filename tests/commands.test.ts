import { describe, expect, it } from 'vitest';
import { rankCommands, type Command } from '../src/commands';

const cmd = (title: string, group: string, keywords = ''): Command => ({ id: title, title, group, keywords, run: () => {} });
const all = [
  cmd('New issue', 'Actions'),
  cmd('Open Help', 'Actions'),
  cmd('#0012 Fix export', 'Issues', 'export bug'),
  cmd('#0120 Export logs', 'Issues'),
  cmd('Export everything', 'Projects'),
  cmd('webhighlights', 'Workspaces'),
];

describe('rankCommands', () => {
  it('shows actions and workspaces when the query is empty', () => {
    expect(rankCommands(all, '').map((c) => c.title)).toEqual(['New issue', 'Open Help', 'webhighlights']);
  });

  it('needs every word and puts prefix matches first', () => {
    expect(rankCommands(all, 'export').map((c) => c.title)).toEqual(['Export everything', '#0012 Fix export', '#0120 Export logs']);
    expect(rankCommands(all, 'export bug').map((c) => c.title)).toEqual(['#0012 Fix export']);
  });

  it('finds an issue by number', () => {
    expect(rankCommands(all, '0012')[0].title).toBe('#0012 Fix export');
  });
});
