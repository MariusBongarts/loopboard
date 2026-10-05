import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mutateIssue } from '../server/mutate';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'tracker-mutate-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function writeFixture(name: string, contents: string): Promise<string> {
  const p = join(dir, name);
  await writeFile(p, contents, 'utf8');
  return p;
}

describe('mutateIssue — priority', () => {
  it('inserts priority immediately after assignee when missing', async () => {
    const file = await writeFixture(
      '0001-foo.md',
      `---
id: 0001
title: Foo
status: todo
assignee: agent
labels: []
---

Body content.
`,
    );

    await mutateIssue(file, { priority: 3 });

    const out = await readFile(file, 'utf8');
    expect(out).toContain('assignee: agent\npriority: 3\n');
    expect(out).toContain('Body content.');
    // Original lines preserved.
    expect(out).toContain('id: 0001');
    expect(out).toContain('title: Foo');
    expect(out).toContain('labels: []');
  });

  it('replaces priority value in place when already present', async () => {
    const file = await writeFixture(
      '0002-bar.md',
      `---
id: 0002
title: Bar
status: in-progress
assignee: agent
priority: 5
labels: [x]
---

Body.
`,
    );

    await mutateIssue(file, { priority: 1 });

    const out = await readFile(file, 'utf8');
    expect(out).toContain('priority: 1\n');
    expect(out).not.toContain('priority: 5');
    // Position preserved (still between assignee and labels).
    const fmBlock = out.split('---')[1];
    const lines = fmBlock.split('\n').filter(Boolean);
    const aIdx = lines.findIndex((l) => l.startsWith('assignee:'));
    const pIdx = lines.findIndex((l) => l.startsWith('priority:'));
    const lIdx = lines.findIndex((l) => l.startsWith('labels:'));
    expect(pIdx).toBe(aIdx + 1);
    expect(lIdx).toBe(pIdx + 1);
  });

  it('is idempotent — re-applying the same priority leaves bytes unchanged', async () => {
    const file = await writeFixture(
      '0003-baz.md',
      `---
id: 0003
title: Baz
status: todo
assignee: agent
priority: 2
---

Body.
`,
    );

    await mutateIssue(file, { priority: 2 });
    const first = await readFile(file, 'utf8');
    await mutateIssue(file, { priority: 2 });
    const second = await readFile(file, 'utf8');
    expect(second).toBe(first);
  });

  it('inserts priority after status when assignee is missing', async () => {
    const file = await writeFixture(
      '0004-qux.md',
      `---
id: 0004
title: Qux
status: todo
labels: []
---

Body.
`,
    );

    await mutateIssue(file, { priority: 4 });

    const out = await readFile(file, 'utf8');
    expect(out).toContain('status: todo\npriority: 4\n');
  });

  it('rejects non-integer or < 1 priority with statusCode 400', async () => {
    const file = await writeFixture(
      '0005-bad.md',
      `---
id: 0005
title: Bad
status: todo
---

Body.
`,
    );

    for (const bad of [0, -1, 1.5, Number.NaN]) {
      await expect(mutateIssue(file, { priority: bad })).rejects.toMatchObject({
        statusCode: 400,
      });
    }
  });

  it('handles a combined patch — status + priority in one write', async () => {
    const file = await writeFixture(
      '0006-combined.md',
      `---
id: 0006
title: Combined
status: in-progress
assignee: agent
---

Body.
`,
    );

    await mutateIssue(file, { status: 'done', priority: 2 });

    const out = await readFile(file, 'utf8');
    expect(out).toContain('status: done\n');
    expect(out).toContain('priority: 2\n');
    expect(out).not.toContain('status: in-progress');
  });

  it('appends priority when no status or assignee line exists', async () => {
    const file = await writeFixture(
      '0007-edge.md',
      `---
id: 0007
title: Edge
labels: []
---

Body.
`,
    );

    await mutateIssue(file, { priority: 7 });

    const out = await readFile(file, 'utf8');
    expect(out).toMatch(/labels: \[\]\npriority: 7\n---/);
  });
});

describe('mutateIssue — review and deploy markers (#0040)', () => {
  const issue = `---
id: 0001
title: Foo
status: done
assignee: agent
labels: []
created: 2026-10-01
---

Body.
`;

  it('inserts reviewed: after created: and deployed: after reviewed:', async () => {
    const file = await writeFixture('0001-foo.md', issue);
    await mutateIssue(file, { reviewed: '2026-10-05' });
    await mutateIssue(file, { deployed: '2026-10-06' });
    expect(await readFile(file, 'utf8')).toContain('created: 2026-10-01\nreviewed: 2026-10-05\ndeployed: 2026-10-06\n---\n\nBody.\n');
  });

  it('removes a marker with null and leaves everything else', async () => {
    const file = await writeFixture('0001-foo.md', issue.replace('created: 2026-10-01', 'created: 2026-10-01\nreviewed: 2026-10-05'));
    await mutateIssue(file, { reviewed: null });
    expect(await readFile(file, 'utf8')).toBe(issue);
  });

  it('rejects a malformed date', async () => {
    const file = await writeFixture('0001-foo.md', issue);
    await expect(mutateIssue(file, { reviewed: 'yesterday' })).rejects.toThrow(/YYYY-MM-DD/);
  });
});

describe('mutateIssue — byte preservation', () => {
  it('keeps the blank line after the frontmatter and every body byte', async () => {
    const original = '---\nid: 0001\ntitle: Foo\nstatus: todo\nassignee: agent\n---\n\n## Body\n\nText.\n';
    const file = await writeFixture('0001-foo.md', original);
    await mutateIssue(file, { status: 'in-progress' });
    expect(await readFile(file, 'utf8')).toBe(original.replace('status: todo', 'status: in-progress'));
  });
});

describe('mutateIssue — labels, project and parent (#0052)', () => {
  const issue = `---
id: 0003
title: Foo
status: todo
assignee: agent # owner
labels: [ui]
created: 2026-10-01
---

Body.
`;

  it('sets project and parent in place and rewrites labels, keeping comments', async () => {
    const file = await writeFixture('0003-foo.md', issue);
    await mutateIssue(file, { project: '01-launch', parent: '7', labels: ['ui', ' bug ', 'ui'] });
    expect(await readFile(file, 'utf8')).toBe(
      issue.replace('assignee: agent # owner\nlabels: [ui]', 'assignee: agent # owner\nproject: 01-launch\nparent: 0007\nlabels: [ui, bug]'),
    );
  });

  it('removes project and parent with empty values and clears labels', async () => {
    const file = await writeFixture('0003-foo.md', issue.replace('labels: [ui]', 'project: 01-launch\nparent: 0007\nlabels: [ui]'));
    await mutateIssue(file, { project: '', parent: null, labels: [] });
    expect(await readFile(file, 'utf8')).toBe(issue.replace('labels: [ui]', 'labels: []'));
  });

  it('rejects bad values with 400', async () => {
    const file = await writeFixture('0003-foo.md', issue);
    for (const patch of [{ parent: '0003' }, { parent: 'abc' }, { project: 'Launch!' }, { labels: ['a,b'] }]) {
      await expect(mutateIssue(file, patch)).rejects.toMatchObject({ statusCode: 400 });
    }
    expect(await readFile(file, 'utf8')).toBe(issue);
  });
});

describe('mutateIssue — concurrent writes', () => {
  it('applies patches to one file one after another, so none is lost', async () => {
    const file = await writeFixture('0003-foo.md', '---\nid: 0003\ntitle: Foo\nstatus: todo\nassignee: agent\nlabels: []\n---\n\nBody.\n');
    await Promise.all([
      mutateIssue(file, { labels: ['ui'] }),
      mutateIssue(file, { parent: '0002' }),
      mutateIssue(file, { project: '01-launch' }),
      mutateIssue(file, { status: 'done' }),
    ]);
    const out = await readFile(file, 'utf8');
    expect(out).toContain('status: done\nassignee: agent\nproject: 01-launch\nparent: 0002\nlabels: [ui]');
  });
});
