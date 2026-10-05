import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createIssue, createProject, skeletonBody } from '../server/create';
import { readAllIssues, readAllProjects } from '../server/issues';

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'loopboard-create-'));
  await cp(join(__dirname, '..', '.agents', 'issues', '_templates'), join(root, 'issues', '_templates'), { recursive: true });
  await cp(join(__dirname, '..', '.agents', 'projects', '_templates'), join(root, 'projects', '_templates'), { recursive: true });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('createIssue', () => {
  it('writes the next number with the category template body', async () => {
    const { id, filename } = await createIssue(root, { title: 'Fix the export', category: 'bug' }, '2026-10-05');
    expect(id).toBe('0001');
    expect(filename).toBe('0001-fix-the-export.md');
    const text = await readFile(join(root, 'issues', filename), 'utf8');
    expect(text.startsWith('---\nid: 0001\ntitle: Fix the export\ncategory: bug\nstatus: todo\nassignee: agent\nlabels: []\ncreated: 2026-10-05\n---\n\n## Steps to reproduce')).toBe(true);
  });

  it('keeps only headings and empty checklists from the template (#0057)', async () => {
    const { filename } = await createIssue(root, { title: 'Tidy up', category: 'task' }, '2026-10-05');
    const text = await readFile(join(root, 'issues', filename), 'utf8');
    expect(text.split('---\n\n')[1]).toBe(
      '## What needs to change\n\n## Why\n\n## Acceptance criteria\n\n- [ ] \n\n## Out of scope\n\n## Notes\n',
    );
    expect(skeletonBody('Intro prose.\n\n## A\n\nSay what.\n\n- [ ] one\n- [x] two\n\n### B\n\n1. step\n')).toBe('## A\n\n- [ ] \n\n### B\n');
  });

  it('quotes titles YAML would misread, so the issue reads back intact', async () => {
    const { filename } = await createIssue(root, { title: 'Someday: dark mode #2', category: 'task', status: 'backlog' });
    expect(filename).toBe('0001-someday-dark-mode-2.md');
    const [issue] = await readAllIssues(root);
    expect(issue).toMatchObject({ title: 'Someday: dark mode #2', status: 'backlog' });
  });

  it('rejects an unknown project and an empty title', async () => {
    await expect(createIssue(root, { title: 'x', category: 'task', project: '09-nope' })).rejects.toThrow(/unknown project/);
    await expect(createIssue(root, { title: '  ', category: 'task' })).rejects.toThrow(/title is required/);
  });
});

describe('createProject', () => {
  it('creates prd.md and wip.md from the templates with a kickoff entry', async () => {
    const { slug } = await createProject(root, 'Export everything', '2026-10-05');
    expect(slug).toBe('01-export-everything');
    const [project] = await readAllProjects(root);
    expect(project).toMatchObject({ slug, title: 'Export everything', status: 'active', lastSession: '2026-10-05' });
    expect(project.focus).toContain('write a PRD for Export everything');
    expect(project.prdBody).toContain('# Export everything — PRD');
    expect(project.prdBody).toContain('> Drafted: 2026-10-05');
    expect(project.wipBody).not.toContain('YYYY-MM-DD');

    const issue = await createIssue(root, { title: 'First slice', category: 'task', project: slug });
    expect((await readAllIssues(root)).find((i) => i.id === issue.id)?.project).toBe(slug);
  });
});
