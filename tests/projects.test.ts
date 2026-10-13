import { describe, expect, it } from 'vitest';
import { parsePhases, parseProjectSort, projectProgress, sortProjectRows, type ProjectRow } from '../src/projects';
import type { Issue, Project } from '../src/types';

const wip = `# P — WIP

## Current focus

Now.

## Phases

### Phase 1 — Clean slate

- [x] [#0001 A](../../issues/0001-a.md) — done
- [ ] [#0002 B](../../issues/0002-b.md) — todo

### Phase 2 — Ship

- [ ] #0003 and #0004

## Activity log

### 2026-10-01

- #0099 mentioned here doesn't count.
`;

const issue = (id: string, status: Issue['status'], over: Partial<Issue> = {}): Issue => ({
  id, filename: `${id}-x.md`, archived: false, title: id, category: 'task', status, assignee: 'agent', labels: [], body: '', project: '01-p', ...over,
});

describe('parsePhases', () => {
  it('reads phase headings and the issues each lists', () => {
    expect(parsePhases(wip)).toEqual([
      { name: 'Phase 1 — Clean slate', ids: ['0001', '0002'] },
      { name: 'Phase 2 — Ship', ids: ['0003', '0004'] },
    ]);
  });

  it('skips dated headings that strayed into the section', () => {
    expect(parsePhases('## Phases\n\n### Phase 1 — A\n\n- #0001\n\n### 2026-09-28 — fixed it\n\n- #0002\n').map((p) => p.name)).toEqual(['Phase 1 — A']);
  });

  it('returns nothing without a Phases section', () => {
    expect(parsePhases('# P\n\n## Activity log\n')).toEqual([]);
  });
});

describe('projectProgress', () => {
  it('counts done and wontfix as closed, overall and per phase', () => {
    const project = { slug: '01-p', wipBody: wip } as Project;
    const issues = [
      issue('0001', 'done', { archived: true }),
      issue('0002', 'todo', { assignee: 'human' }),
      issue('0003', 'wontfix'),
      issue('0004', 'in-progress'),
      issue('0005', 'todo', { project: '02-other' }),
    ];
    expect(projectProgress(project, issues)).toEqual({
      closed: 2,
      total: 4,
      needsYou: 1,
      phases: [
        { name: 'Phase 1 — Clean slate', ids: ['0001', '0002'], closed: 1, total: 2 },
        { name: 'Phase 2 — Ship', ids: ['0003', '0004'], closed: 1, total: 2 },
      ],
    });
  });

  it('leaves backlog ideas out of the counts, and phases with nothing scheduled', () => {
    const withBacklog = wip.replace('## Activity log', '### Backlog\n\n- [ ] #0006\n\n## Activity log');
    const project = { slug: '01-p', wipBody: withBacklog } as Project;
    const issues = [issue('0001', 'done'), issue('0002', 'todo'), issue('0006', 'backlog')];
    const progress = projectProgress(project, issues);
    expect(progress).toMatchObject({ closed: 1, total: 2 });
    expect(progress.phases.map((p) => p.name)).toEqual(['Phase 1 — Clean slate']);
  });
});

describe('sortProjectRows', () => {
  const row = (slug: string, title: string, closed: number, total: number, needsYou: number, lastSession?: string): ProjectRow => ({
    project: { slug, title, lastSession } as Project,
    progress: { closed, total, needsYou, phases: [] },
  });
  const rows = [
    row('02-b', 'Beta', 1, 4, 0, '2026-10-01'),
    row('10-c', 'Charlie', 0, 0, 3, '2026-10-05'),
    row('03-a', 'Alpha', 3, 4, 1),
    row('01-d', 'Delta', 2, 2, 1, '2026-10-01'),
  ];
  const order = (sort: Parameters<typeof sortProjectRows>[1]) => sortProjectRows(rows, sort).map((r) => r.project.title);

  it('puts the most recent session first, projects without one last', () => {
    expect(order('active')).toEqual(['Charlie', 'Beta', 'Delta', 'Alpha']);
  });

  it('orders by PRD number, newest first', () => {
    expect(order('newest')).toEqual(['Charlie', 'Alpha', 'Beta', 'Delta']);
  });

  it('orders by share closed, with nothing scheduled last', () => {
    expect(order('progress')).toEqual(['Delta', 'Alpha', 'Beta', 'Charlie']);
  });

  it('orders by issues that need me, then by last session', () => {
    expect(order('you')).toEqual(['Charlie', 'Delta', 'Alpha', 'Beta']);
  });

  it('orders by name', () => {
    expect(order('name')).toEqual(['Alpha', 'Beta', 'Charlie', 'Delta']);
  });

  it('falls back to last active for an unknown stored choice', () => {
    expect(parseProjectSort('progress')).toBe('progress');
    expect(parseProjectSort('bogus')).toBe('active');
    expect(parseProjectSort(null)).toBe('active');
  });
});
