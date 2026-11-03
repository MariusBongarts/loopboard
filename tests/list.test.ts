import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS, backlogGroups, filterIssues, filtersFromQuery, filtersToQuery, groupIssues } from '../src/list';
import type { Issue } from '../src/types';

const issue = (id: string, over: Partial<Issue> = {}): Issue => ({
  id, filename: `${id}-x.md`, archived: false, title: `Title ${id}`, category: 'task', status: 'todo', assignee: 'agent', labels: [], body: '', created: `2026-09-${id.slice(2)}`, ...over,
});
const issues = [
  issue('0001', { labels: ['ui'], project: '01-a' }),
  issue('0002', { status: 'done', assignee: 'human', labels: ['ui', 'api'] }),
  issue('0003', { status: 'in-progress', project: '01-a' }),
  issue('0004', { archived: true }),
];

describe('list filters', () => {
  it('round-trip through the URL query, omitting defaults', () => {
    const f = { ...DEFAULT_FILTERS, group: 'label' as const, who: 'human' as const, statuses: ['todo' as const, 'done' as const], q: 'ui' };
    expect(filtersToQuery(f)).toEqual({ group: 'label', who: 'human', status: 'todo,done', q: 'ui' });
    expect(filtersFromQuery(filtersToQuery(f))).toEqual(f);
    expect(filtersFromQuery({ status: 'todo,bogus', group: 'nope' })).toEqual({ ...DEFAULT_FILTERS, statuses: ['todo'] });
  });

  it('filter by assignee, status, label and words; never archived', () => {
    expect(filterIssues(issues, DEFAULT_FILTERS).map((i) => i.id)).toEqual(['0001', '0002', '0003']);
    expect(filterIssues(issues, { ...DEFAULT_FILTERS, who: 'human' }).map((i) => i.id)).toEqual(['0002']);
    expect(filterIssues(issues, { ...DEFAULT_FILTERS, statuses: ['todo', 'in-progress'], label: 'ui' }).map((i) => i.id)).toEqual(['0001']);
    expect(filterIssues(issues, { ...DEFAULT_FILTERS, q: 'title 0003' }).map((i) => i.id)).toEqual(['0003']);
  });
});

describe('groupIssues', () => {
  const live = issues.filter((i) => !i.archived);
  it('groups by status in workflow order, newest first inside', () => {
    expect(groupIssues(live, 'status').map((g) => [g.label, g.issues.map((i) => i.id)])).toEqual([
      ['Todo', ['0001']],
      ['In progress', ['0003']],
      ['Done', ['0002']],
    ]);
  });
  it('groups by project and label, with the empty group last', () => {
    expect(groupIssues(live, 'project', (s) => s.toUpperCase()).map((g) => g.label)).toEqual(['01-A', 'No project']);
    expect(groupIssues(live, 'label').map((g) => [g.label, g.issues.length])).toEqual([['api', 1], ['ui', 2], ['No label', 1]]);
  });
});

describe('backlogGroups', () => {
  const ideas = [
    issue('0010', { status: 'backlog', project: '01-a', priority: 2 }),
    issue('0011', { status: 'backlog', project: '01-a', priority: 1 }),
    issue('0012', { status: 'backlog', project: '01-a' }),
    issue('0013', { status: 'backlog', title: 'Standalone idea' }),
    issue('0014', { status: 'backlog', project: '02-b' }),
    issue('0015', { status: 'backlog', archived: true }),
    issue('0016', { project: '01-a' }),
  ];
  const title = (slug: string) => `Project ${slug}`;

  it('groups live ideas by project in priority order, no project last', () => {
    const groups = backlogGroups(ideas, [], title);
    expect(groups.map((g) => [g.label, g.issues.map((i) => i.id)])).toEqual([
      ['Project 01-a', ['0011', '0010', '0012']],
      ['Project 02-b', ['0014']],
      ['No project', ['0013']],
    ]);
  });

  it('keeps only ideas matching every word', () => {
    expect(backlogGroups(ideas, ['standalone', 'idea'], title).flatMap((g) => g.issues.map((i) => i.id))).toEqual(['0013']);
  });
});
