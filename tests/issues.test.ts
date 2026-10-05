import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readAllIssues } from '../server/issues';
import { mutateIssue } from '../server/mutate';

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'loopboard-issues-'));
  await mkdir(join(root, 'issues'), { recursive: true });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

// `source:` documents an external report (#0004); the tracker must tolerate it.
describe('optional source field', () => {
  const contents = `---
id: 0091
title: Crash on empty wip.md
category: bug
status: todo
assignee: agent
labels: []
source: github#12
created: 2026-10-04
---

Body.
`;

  it('reads an issue that carries source: like any other', async () => {
    await writeFile(join(root, 'issues', '0091-crash-on-empty-wip.md'), contents, 'utf8');

    const issues = await readAllIssues(root);

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ id: '0091', title: 'Crash on empty wip.md', status: 'todo' });
  });

  it('keeps source: when the status is rewritten', async () => {
    const file = join(root, 'issues', '0091-crash-on-empty-wip.md');
    await writeFile(file, contents, 'utf8');

    await mutateIssue(file, { status: 'in-progress' });

    const out = await readFile(file, 'utf8');
    expect(out).toContain('status: in-progress');
    expect(out).toContain('source: github#12');
  });
});

// Review and deploy markers are optional dates on done issues (#0039).
describe('review and deploy markers', () => {
  it('reads a done issue that carries reviewed: and deployed:', async () => {
    await writeFile(
      join(root, 'issues', '0092-ship-export.md'),
      `---
id: 0092
title: Ship export
category: task
status: done
assignee: agent
labels: []
created: 2026-10-01
reviewed: 2026-10-03
deployed: 2026-10-04
---

Body.
`,
      'utf8',
    );

    const issues = await readAllIssues(root);

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ id: '0092', status: 'done', created: '2026-10-01' });
  });
});

// gray-matter caches a file before parsing it; a throw must not leave a ghost (#0042).
describe('malformed issue files', () => {
  it('skips a file with invalid frontmatter on every read', async () => {
    await writeFile(
      join(root, 'issues', '0093-ghost.md'),
      '---\nid: 0093\ntitle: Someday: dark mode\nstatus: backlog\n---\nBody.\n',
      'utf8',
    );

    expect(await readAllIssues(root)).toHaveLength(0);
    expect(await readAllIssues(root)).toHaveLength(0);
  });
});

// js-yaml reads an unquoted 0016 as octal 14 (#0059).
describe('parent ids', () => {
  it('keeps ids whose digits are all 0–7', async () => {
    const issue = (id: string, parent: string) =>
      `---\nid: ${id}\ntitle: Child ${id}\nstatus: todo\nparent: ${parent}\n---\nBody.\n`;
    await writeFile(join(root, 'issues', '0017-child.md'), issue('0017', '0016'), 'utf8');
    await writeFile(join(root, 'issues', '0036-quoted.md'), issue('0036', '"0035" # quoted'), 'utf8');
    await writeFile(join(root, 'issues', '0040-short.md'), issue('0040', '12'), 'utf8');

    const parents = (await readAllIssues(root)).map((i) => [i.id, i.parent]);
    expect(parents).toEqual([
      ['0017', '0016'],
      ['0036', '0035'],
      ['0040', '0012'],
    ]);
  });
});
