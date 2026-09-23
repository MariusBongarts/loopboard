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
