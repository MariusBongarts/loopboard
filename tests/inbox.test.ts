import { describe, expect, it } from 'vitest';
import {
  buildFeed,
  dayLabel,
  filterFeed,
  groupByDay,
  issueRefSegments,
  needsYou,
  projectsByLastSession,
  relativeDay,
  splitNote,
} from '../src/inbox';
import { STANDALONE, type Issue, type Project } from '../src/types';

function issue(over: Partial<Issue>): Issue {
  return {
    id: '0001',
    filename: '0001-x.md',
    archived: false,
    title: 'Issue',
    category: 'task',
    status: 'todo',
    assignee: 'agent',
    labels: [],
    body: '',
    ...over,
  };
}

function project(over: Partial<Project>): Project {
  return {
    slug: '01-a',
    title: 'A',
    status: 'active',
    prdPath: '',
    wipPath: '',
    prdBody: '',
    wipBody: '',
    focus: '',
    problem: '',
    solution: '',
    sessions: [],
    ...over,
  };
}

const projects = [
  project({ slug: '01-a', title: 'A', lastSession: '2026-09-20', sessions: [{ date: '2026-09-20', note: 'A worked.' }] }),
  project({ slug: '02-b', title: 'B', lastSession: '2026-09-22', sessions: [{ date: '2026-09-22', note: 'B worked.' }] }),
];
const issues = [
  issue({ id: '0010', project: '01-a', created: '2026-09-21', assignee: 'human', status: 'in-progress' }),
  issue({ id: '0011', project: '02-b', created: '2026-09-22', status: 'done', assignee: 'human' }),
  issue({ id: '0012', created: '2026-09-19', assignee: 'human' }),
  issue({ id: '0013', project: '01-a', created: '2026-09-23', archived: true }),
];

describe('needsYou', () => {
  it('is a human-assigned, open, non-archived issue', () => {
    expect(needsYou(issues[0])).toBe(true);
    expect(needsYou(issues[1])).toBe(false);
    expect(needsYou(issue({ assignee: 'human', status: 'backlog' }))).toBe(false);
    expect(needsYou(issue({ assignee: 'human', archived: true }))).toBe(false);
  });
});

describe('buildFeed', () => {
  it('merges sessions and live issues newest first, sessions before issues on a day', () => {
    const keys = buildFeed(issues, projects).map((e) => e.key);
    expect(keys).toEqual(['s:02-b:2026-09-22', 'i:0011', 'i:0010', 's:01-a:2026-09-20', 'i:0012']);
  });
});

describe('filterFeed', () => {
  const feed = buildFeed(issues, projects);
  it('keeps only matching kinds', () => {
    expect(filterFeed(feed, 'sessions').every((e) => e.kind === 'session')).toBe(true);
    expect(filterFeed(feed, 'issues').every((e) => e.kind === 'issue')).toBe(true);
  });
  it('"you" keeps issues that need the maintainer', () => {
    expect(filterFeed(feed, 'you').map((e) => e.key)).toEqual(['i:0010', 'i:0012']);
  });
  it('narrows to one project, or to standalone issues', () => {
    expect(filterFeed(feed, 'all', '01-a').map((e) => e.key)).toEqual(['i:0010', 's:01-a:2026-09-20']);
    expect(filterFeed(feed, 'issues', STANDALONE).map((e) => e.key)).toEqual(['i:0012']);
  });
});

describe('groupByDay', () => {
  it('groups consecutive items by date, keeping feed order', () => {
    const days = groupByDay(buildFeed(issues, projects));
    expect(days.map((d) => [d.date, d.items.map((e) => e.key)])).toEqual([
      ['2026-09-22', ['s:02-b:2026-09-22', 'i:0011']],
      ['2026-09-21', ['i:0010']],
      ['2026-09-20', ['s:01-a:2026-09-20']],
      ['2026-09-19', ['i:0012']],
    ]);
  });
  it('puts undated issues in their own trailing day', () => {
    const days = groupByDay(buildFeed([issue({ id: '0020', created: undefined })], projects));
    expect(days[days.length - 1]).toMatchObject({ date: '' });
  });
});

describe('dayLabel', () => {
  it('names recent days and formats older ones', () => {
    expect(dayLabel('2026-09-23', '2026-09-23')).toBe('Today');
    expect(dayLabel('2026-09-22', '2026-09-23')).toBe('Yesterday');
    expect(dayLabel('2026-09-16', '2026-09-23')).toBe('Wed, 16 Sep');
    expect(dayLabel('2025-12-31', '2026-09-23')).toBe('Wed, 31 Dec 2025');
    expect(dayLabel('', '2026-09-23')).toBe('No date');
  });
});

describe('splitNote', () => {
  it('splits at the first sentence end', () => {
    expect(splitNote('Release 12 is on internal testing. The reviewer account is seeded.')).toEqual([
      'Release 12 is on internal testing.',
      'The reviewer account is seeded.',
    ]);
  });
  it('cuts long unpunctuated notes at a word boundary', () => {
    const note = 'word '.repeat(60).trim();
    const [head, rest] = splitNote(note);
    expect(head.endsWith('…')).toBe(true);
    expect(head.length).toBeLessThanOrEqual(132);
    expect(rest.length).toBeGreaterThan(0);
  });
});

describe('relativeDay', () => {
  it('describes distance from today', () => {
    expect(relativeDay('2026-09-23', '2026-09-23')).toBe('today');
    expect(relativeDay('2026-09-22', '2026-09-23')).toBe('yesterday');
    expect(relativeDay('2026-09-20', '2026-09-23')).toBe('3d ago');
    expect(relativeDay('2026-09-02', '2026-09-23')).toBe('3w ago');
    expect(relativeDay(undefined, '2026-09-23')).toBe('');
  });
});

describe('issueRefSegments', () => {
  it('splits text around #NNNN references', () => {
    expect(issueRefSegments('Start #0482, then #0454.')).toEqual([
      { kind: 'text', value: 'Start ' },
      { kind: 'issue', id: '0482' },
      { kind: 'text', value: ', then ' },
      { kind: 'issue', id: '0454' },
      { kind: 'text', value: '.' },
    ]);
  });
});

describe('projectsByLastSession', () => {
  it('orders newest session first', () => {
    expect(projectsByLastSession(projects).map((p) => p.slug)).toEqual(['02-b', '01-a']);
  });
});
