import { describe, expect, it } from 'vitest';
import { applyIssueFields, readIssueFields } from '../shared/frontmatter';
import { fromEditorMarkdown, spliceMarkdown, toEditorMarkdown } from '../src/splice';

const file = `---
id: 0001
title: "Fix: the export"
category: task
status: todo             # a comment that must survive
assignee: agent
labels: [ui, "a: b"]
created: 2026-10-01
---

Body.
`;

describe('issue fields', () => {
  it('reads quoted titles and flow-style labels', () => {
    expect(readIssueFields(file)).toEqual({
      title: 'Fix: the export',
      status: 'todo',
      assignee: 'agent',
      labels: ['ui', 'a: b'],
      project: '',
      parent: '',
    });
  });

  // A ` #` starts a comment only outside quotes (#0078).
  it('reads a quoted value with " #" in it whole', () => {
    const fields = (title: string) => readIssueFields(`---\nid: 0001\ntitle: ${title}\nstatus: todo\n---\n`)?.title;

    expect(fields('"Fix #12 again"')).toBe('Fix #12 again');
    expect(fields('"Fix #12 again"   # the second try')).toBe('Fix #12 again');
    expect(fields("'it''s #1'")).toBe("it's #1");
    expect(fields('"a \\" #b"')).toBe('a " #b');
    expect(fields('Fix the export # later')).toBe('Fix the export');
  });

  it('rewrites only changed lines, keeping comments, order and body', () => {
    const before = readIssueFields(file)!;
    const after = { ...before, status: 'in-progress', project: '01-launch', parent: '0042', labels: ['ui'] };
    expect(applyIssueFields(file, before, after)).toBe(`---
id: 0001
title: "Fix: the export"
category: task
status: in-progress             # a comment that must survive
assignee: agent
project: 01-launch
parent: 0042
labels: [ui]
created: 2026-10-01
---

Body.
`);
    const cleared = applyIssueFields(applyIssueFields(file, before, after), after, { ...after, project: '', parent: '' });
    expect(cleared).not.toMatch(/^project:|^parent:/m);
  });
});

describe('raw blocks through the editor', () => {
  const body = 'Intro.\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n<!-- keep -->\n\nEnd.\n';

  it('wraps tables and HTML as editable source and unwraps them unchanged', () => {
    const wrapped = toEditorMarkdown(body);
    expect(wrapped).toContain('```loopboard-raw\n| a | b |\n|---|---|\n| 1 | 2 |\n```');
    expect(wrapped).toContain('```loopboard-raw\n<!-- keep -->\n```');
    expect(spliceMarkdown(body, fromEditorMarkdown(wrapped))).toBe(body);
  });

  it('takes an edited raw block as the new source', () => {
    const edited = fromEditorMarkdown(toEditorMarkdown(body).replace('| 1 | 2 |', '| 1 | 3 |'));
    expect(spliceMarkdown(body, edited)).toBe(body.replace('| 1 | 2 |', '| 1 | 3 |'));
  });
});
