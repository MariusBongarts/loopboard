import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { chmod, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findIssueFile, readAllIssues, readBoard } from '../server/issues';
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

// A file the reader can't show is reported, never dropped (#0071).
describe('skipped files', () => {
  const issue = (id: string, title = `Issue ${id}`) => `---\nid: ${id}\ntitle: ${title}\nstatus: todo\n---\nBody.\n`;
  const shown = async () => (await readBoard(root)).issues.map((i) => i.filename);
  // chmod can't lock a file on Windows, and root reads everything.
  const canLock = process.platform !== 'win32' && process.getuid?.() !== 0;

  beforeEach(async () => {
    await writeFile(join(root, 'issues', '0001-fine.md'), issue('0001'), 'utf8');
  });

  it('reports nothing for a clean root', async () => {
    await writeFile(join(root, 'issues', 'README.md'), '# Issues\n', 'utf8');
    await mkdir(join(root, 'issues', '_templates'));
    expect((await readBoard(root)).skipped).toEqual([]);
  });

  it('reports malformed frontmatter with the parser\'s reason', async () => {
    await writeFile(join(root, 'issues', '0003-broken.md'), issue('0003', 'Broken: unquoted colon'), 'utf8');

    const { skipped } = await readBoard(root);

    expect(skipped).toEqual([{ file: 'issues/0003-broken.md', reason: expect.stringMatching(/^invalid frontmatter: .+ at line 3, column \d+$/) }]);
    expect(await shown()).toEqual(['0001-fine.md']);
  });

  it('reports a filename that looks like an issue but breaks the pattern', async () => {
    await writeFile(join(root, 'issues', '0002-Tax-Return.md'), issue('0002'), 'utf8');
    await mkdir(join(root, 'issues', '_archive'));
    await writeFile(join(root, 'issues', '_archive', '0004-old copy.md'), issue('0004'), 'utf8');

    const { skipped } = await readBoard(root);

    expect(skipped).toEqual([
      { file: 'issues/0002-Tax-Return.md', reason: 'name must be NNNN-slug.md (lowercase letters, digits and dashes)' },
      { file: 'issues/_archive/0004-old copy.md', reason: 'name must be NNNN-slug.md (lowercase letters, digits and dashes)' },
    ]);
    expect(await shown()).toEqual(['0001-fine.md']);
  });

  it.skipIf(!canLock)('reports a file it may not read instead of failing', async () => {
    const locked = join(root, 'issues', '0005-locked.md');
    await writeFile(locked, issue('0005'), 'utf8');
    await chmod(locked, 0o000);
    try {
      const { skipped } = await readBoard(root);
      expect(skipped).toEqual([{ file: 'issues/0005-locked.md', reason: "can't be read (EACCES)" }]);
      expect(await shown()).toEqual(['0001-fine.md']);
    } finally {
      await chmod(locked, 0o644);
    }
  });

  it.skipIf(process.platform === 'win32')('reports a placeholder that points nowhere', async () => {
    await symlink(join(root, 'gone.md'), join(root, 'issues', '0006-offline.md'));

    expect((await readBoard(root)).skipped).toEqual([{ file: 'issues/0006-offline.md', reason: "can't be read (ENOENT)" }]);
    expect(await shown()).toEqual(['0001-fine.md']);
  });

  it('reports a folder named like an issue', async () => {
    await mkdir(join(root, 'issues', '0007-a-folder.md'));

    expect((await readBoard(root)).skipped).toEqual([{ file: 'issues/0007-a-folder.md', reason: expect.stringMatching(/^can't be read \(E\w+\)$/) }]);
  });

  it('reports project folders with an invalid name', async () => {
    for (const name of ['01-launch', '02-Offline-Mode', 'sharing', '_templates']) {
      await mkdir(join(root, 'projects', name), { recursive: true });
      await writeFile(join(root, 'projects', name, 'wip.md'), `# ${name} — WIP\n`, 'utf8');
    }
    await writeFile(join(root, 'projects', 'README.md'), '# Projects\n', 'utf8');

    const { projects, skipped } = await readBoard(root);

    expect(projects.map((p) => p.slug)).toEqual(['01-launch']);
    expect(skipped).toEqual([
      { file: 'projects/02-Offline-Mode', reason: 'folder must be named NN-slug (lowercase letters, digits and dashes)' },
      { file: 'projects/sharing', reason: 'folder must be named NN-slug (lowercase letters, digits and dashes)' },
    ]);
  });

  it('never writes to a skipped twin of a shown issue', async () => {
    await writeFile(join(root, 'issues', '0001-Fine copy.md'), issue('0001'), 'utf8');
    expect(findIssueFile('0001', false, root)).toBe(join(root, 'issues', '0001-fine.md'));
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
