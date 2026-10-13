import { describe, expect, it } from 'vitest';
import {
  boardColumnIssues,
  boardIssueCount,
  buildFeed,
  dayLabel,
  filterFeed,
  groupByDay,
  issueRefSegments,
  needsYou,
  prdNumber,
  projectsByLastSession,
  relativeDay,
  searchFeed,
  readPinnedSlugs,
  searchProjects,
  splitNote,
  splitPinnedProjects,
  togglePinnedSlug,
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

  // #0100: `shop#0003` is issue 0003 of another harness, not the local one.
  it('leaves a number directly after a letter or digit as text', () => {
    expect(issueRefSegments('shop#0003 is next')).toEqual([{ kind: 'text', value: 'shop#0003 is next' }]);
    expect(issueRefSegments('Blocked by shop#0003, then #0004')).toEqual([
      { kind: 'text', value: 'Blocked by shop#0003, then ' },
      { kind: 'issue', id: '0004' },
    ]);
  });

  it('still links a bare, bracketed or sentence-ending #NNNN', () => {
    expect(issueRefSegments('#0003')).toEqual([{ kind: 'issue', id: '0003' }]);
    expect(issueRefSegments('Kickoff (#0003)')).toEqual([
      { kind: 'text', value: 'Kickoff (' },
      { kind: 'issue', id: '0003' },
      { kind: 'text', value: ')' },
    ]);
    expect(issueRefSegments('Start #0003.')).toEqual([
      { kind: 'text', value: 'Start ' },
      { kind: 'issue', id: '0003' },
      { kind: 'text', value: '.' },
    ]);
  });

  it('links the label of an issue-file link, not the number in its path', () => {
    expect(issueRefSegments('[#0003 First](../../issues/0003-first.md)')).toEqual([
      { kind: 'text', value: '[' },
      { kind: 'issue', id: '0003' },
      { kind: 'text', value: ' First](../../issues/0003-first.md)' },
    ]);
    expect(issueRefSegments('[First](../../issues/0003-first.md)')).toEqual([
      { kind: 'text', value: '[First](../../issues/0003-first.md)' },
    ]);
  });
});

describe('projectsByLastSession', () => {
  it('orders newest session first', () => {
    expect(projectsByLastSession(projects).map((p) => p.slug)).toEqual(['02-b', '01-a']);
  });
});

describe('prdNumber', () => {
  it('reads the leading project number from a slug', () => {
    expect(prdNumber('29-android-app-release')).toBe('29');
    expect(prdNumber(STANDALONE)).toBe('');
    expect(prdNumber(undefined)).toBe('');
  });
});

describe('searchFeed', () => {
  const bySlug = new Map(projects.map((p) => [p.slug, p]));
  const feed = buildFeed(
    [
      issue({ id: '0020', project: '01-a', title: 'Fix the keystore', created: '2026-09-20' }),
      issue({ id: '0021', project: '02-b', title: 'Pricing page', labels: ['paddle'], created: '2026-09-21' }),
    ],
    projects,
  );

  it('keeps everything without tokens', () => {
    expect(searchFeed(feed, [], bySlug)).toHaveLength(feed.length);
  });

  it('matches issue ids, titles and labels', () => {
    expect(searchFeed(feed, ['0020'], bySlug).map((e) => e.key)).toEqual(['i:0020']);
    expect(searchFeed(feed, ['paddle'], bySlug).map((e) => e.key)).toEqual(['i:0021']);
  });

  it('matches session notes and the project name, all tokens required', () => {
    expect(searchFeed(feed, ['worked', 'b'], bySlug).map((e) => e.key)).toEqual(['s:02-b:2026-09-22']);
    expect(searchFeed(feed, ['01-a', 'keystore'], bySlug).map((e) => e.key)).toEqual(['i:0020']);
  });
});

describe('boardColumnIssues', () => {
  const board = [
    issue({ id: '0002', project: '01-a', status: 'done', priority: 2 }),
    issue({ id: '0001', project: '01-a', status: 'done', priority: 1 }),
    issue({ id: '0003', project: '01-a', status: 'todo', archived: true, created: '2026-09-01' }),
    issue({ id: '0004', project: '01-a', status: 'in-review', archived: true, created: '2026-09-20' }),
    issue({ id: '0005', project: '02-b', status: 'done', archived: true }),
    issue({ id: '0006', project: '01-a', status: 'todo' }),
    issue({ id: '0007', status: 'backlog', archived: true, created: '2026-09-10' }),
  ];

  it('puts every archived issue in this project into Done, after live done cards', () => {
    expect(boardColumnIssues(board, '01-a', 'done').map((i) => i.id)).toEqual([
      '0001',
      '0002',
      '0004',
      '0003',
    ]);
    expect(boardColumnIssues(board, '01-a', 'todo').map((i) => i.id)).toEqual(['0006']);
    expect(boardColumnIssues(board, null, 'done').map((i) => i.id)).toEqual(['0007']);
  });

  it('still honors assignee and search filters', () => {
    const filtered = boardColumnIssues(
      board.map((i) => (i.id === '0004' ? { ...i, assignee: 'human', title: 'Keystore' } : i)),
      '01-a',
      'done',
      'human',
      ['keystore'],
    );
    expect(filtered.map((i) => i.id)).toEqual(['0004']);
  });

  it('counts archived issues on the board and skips live backlog', () => {
    expect(boardIssueCount(board, '01-a')).toBe(5);
    expect(boardIssueCount(board, null)).toBe(1);
  });
});

describe('pinned projects', () => {
  it('parses a stored slug list and ignores junk', () => {
    expect(readPinnedSlugs(null)).toEqual([]);
    expect(readPinnedSlugs('["07-keyword","32-i18n"]')).toEqual(['07-keyword', '32-i18n']);
    expect(readPinnedSlugs('nope')).toEqual([]);
    expect(readPinnedSlugs('[1, "", "ok"]')).toEqual(['ok']);
  });

  it('pins newest first and unpin removes the slug', () => {
    expect(togglePinnedSlug(['a'], 'b')).toEqual(['b', 'a']);
    expect(togglePinnedSlug(['b', 'a'], 'b')).toEqual(['a']);
  });

  it('lifts pinned projects in stored order and drops unknown slugs', () => {
    const { pinned, rest } = splitPinnedProjects(projects, ['missing', '02-b', '01-a']);
    expect(pinned.map((p) => p.slug)).toEqual(['02-b', '01-a']);
    expect(rest).toEqual([]);
  });
});

describe('searchProjects', () => {
  it('matches slug, title and number', () => {
    expect(searchProjects(projects, ['02']).map((p) => p.slug)).toEqual(['02-b']);
    expect(searchProjects(projects, ['a']).map((p) => p.slug)).toEqual(['01-a']);
  });
});
