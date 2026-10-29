import { describe, expect, it } from 'vitest';
import { buildHome, findRun, issueOrigins, parsePeek, peekValue, periodStart, runKey, runSummary, splitRunNote, type HomeInput, type RunEntry } from '../src/home';
import type { Issue, Project, RoutineSummary, Run } from '../src/types';

// Home (project 06): the timeline, the run summary, filed vs mentioned, the
// health column and what counts as new.

function issue(over: Partial<Issue>): Issue {
  return { id: '0001', filename: '0001-x.md', archived: false, title: 'Issue', category: 'task', status: 'todo', assignee: 'agent', labels: [], body: '', ...over };
}

function project(over: Partial<Project>): Project {
  return { slug: '01-a', title: 'A', status: 'active', prdPath: '', wipPath: '', prdBody: '', wipBody: '', focus: '', problem: '', solution: '', sessions: [], ...over };
}

function run(at: string, note = '', status: Run['status'] = 'ok'): Run {
  return { status, at: `${at}:00+01:00`, started: `${at}:00+01:00`, note };
}

function routine(slug: string, runs: Run[], over: Partial<RoutineSummary> = {}): RoutineSummary {
  return {
    slug, dir: '', title: slug, kind: 'agent', enabled: true, state: 'idle', schedule: '0 8 * * *', at: null, timezone: 'Europe/Berlin',
    words: 'Every day at 08:00', expiresAfter: null, timeout: '2h', host: null, writesTo: [], created: null, creates: null,
    next: '2026-10-30T08:00:00+01:00', slot: null, lastRun: runs[runs.length - 1] ?? null, runs, days: [], problems: [], body: '', ...over,
  };
}

// A run written at a wall-clock time in this machine's own zone.
function localRun(day: number, hour: number, note: string): Run {
  const d = new Date(2026, 9, day, hour);
  const off = -d.getTimezoneOffset();
  const zone = `${off < 0 ? '-' : '+'}${String(Math.floor(Math.abs(off) / 60)).padStart(2, '0')}:${String(Math.abs(off) % 60).padStart(2, '0')}`;
  const at = `2026-10-${day}T${String(hour).padStart(2, '0')}:00:00${zone}`;
  return { status: 'ok', at, started: at, note };
}

const NOW = Date.parse('2026-10-29T10:00:00+01:00');
function home(over: Partial<HomeInput>) {
  return buildHome({ issues: [], projects: [], routines: [], today: '2026-10-29', now: NOW, period: '7d', lastSeen: NOW, ...over });
}
const runs = (h: ReturnType<typeof buildHome>) => h.days.flatMap((d) => d.entries).filter((e): e is RunEntry => e.kind === 'run');

describe('the run summary', () => {
  it('is the first line of the note', () => {
    expect(runSummary(run('2026-10-29T08:00', 'Nothing filed · 2 need you (#0099)\n\n**Needs you**\n* #0099 …'))).toBe('Nothing filed · 2 need you (#0099)');
  });

  it('takes the next line along when the first is a heading', () => {
    expect(runSummary(run('2026-10-29T08:00', '📬 NEEDS YOU (4)\n1. Paddle — 2 disputes\n2. Export fails'))).toBe('📬 NEEDS YOU (4) · Paddle — 2 disputes');
    expect(splitRunNote('📬 NEEDS YOU (4)\n1. Paddle\n2. Export fails').rest).toBe('2. Export fails');
  });

  it('drops markdown marks and clips a long line', () => {
    const long = `**Seen:** ${'word '.repeat(60)}`;
    const summary = runSummary(run('2026-10-29T08:00', long));
    expect(summary.startsWith('Seen: word')).toBe(true);
    expect(summary.length).toBeLessThanOrEqual(171);
    expect(summary.endsWith('…')).toBe(true);
  });

  it('says since when a run without a note is running', () => {
    expect(runSummary(run('2026-10-29T09:53', '', 'running'))).toBe('Running since 09:53');
  });
});

describe('the timeline', () => {
  it('groups runs by the day runs.md wrote, newest first, within the period', () => {
    const h = home({
      routines: [routine('triage', [run('2026-10-20T08:00', 'Old'), run('2026-10-27T08:00', 'Mon'), run('2026-10-29T08:00', 'Today')]), routine('e2e', [run('2026-10-29T02:00', 'Green')])],
    });
    expect(h.start).toBe('2026-10-22');
    expect(h.days.map((d) => d.day)).toEqual(['2026-10-29', '2026-10-27']);
    expect(runs(h).map((e) => e.summary)).toEqual(['Today', 'Green', 'Mon']);
    expect(runs(h)[0].time).toBe('08:00');
  });

  it('starts today, 7 or 30 days back', () => {
    expect(periodStart('2026-10-29', 'today')).toBe('2026-10-29');
    expect(periodStart('2026-10-29', '7d')).toBe('2026-10-22');
    expect(periodStart('2026-03-02', '30d')).toBe('2026-01-31');
  });

  it('collapses runs that went fine and have nothing to show', () => {
    const byId = [issue({ id: '0112', created: '2026-10-13' })];
    const h = home({
      issues: byId,
      routines: [
        routine('e2e', [run('2026-10-27T02:00', 'All green'), run('2026-10-28T02:00', 'Port taken', 'failed'), run('2026-10-29T02:00', 'Baselines skipped (#0112)')]),
        routine('weekly', [run('2026-10-29T06:00', 'Nothing to file')], { kind: 'issue' }),
      ],
    });
    const by = Object.fromEntries(runs(h).map((e) => [e.summary, e.collapsed]));
    expect(by).toEqual({ 'All green': true, 'Port taken': false, 'Baselines skipped (#0112)': false, 'Nothing to file': true });
  });

  it('puts runs before sessions before hand-filed issues on one day', () => {
    const h = home({
      issues: [issue({ id: '0200', created: '2026-10-29' })],
      projects: [project({ slug: '06-home', sessions: [{ date: '2026-10-29', note: 'Drafted the PRD.' }] })],
      routines: [routine('triage', [run('2026-10-29T08:00', 'Quiet')])],
    });
    expect(h.days[0].entries.map((e) => e.kind)).toEqual(['run', 'session', 'issue']);
  });
});

describe('filed and mentioned issues', () => {
  const issues = [
    issue({ id: '0124', created: '2026-10-27' }),
    issue({ id: '0099', created: '2026-10-13', assignee: 'human', status: 'in-review' }),
    issue({ id: '0127', created: '2026-10-26', recurrence: 'grooming@2026-W44' }),
    issue({ id: '0130', created: '2026-10-27', archived: true }),
  ];

  it('counts a reference to an issue created on the run’s day as filed, other references as mentioned', () => {
    const h = home({ issues, routines: [routine('triage', [run('2026-10-27T08:00', 'Filed #0124 · needs you #0099 · gone #0130 · missing #0999')])] });
    const [entry] = runs(h);
    expect(entry.filed.map((i) => i.id)).toEqual(['0124']);
    expect(entry.mentioned.map((i) => i.id)).toEqual(['0099']);
  });

  it('matches what an issue routine filed by its recurrence', () => {
    const h = home({ issues, routines: [routine('grooming', [run('2026-10-26T06:00', 'Week 44')], { kind: 'issue' })] });
    expect(runs(h)[0].filed.map((i) => i.id)).toEqual(['0127']);
  });

  it('shows a filed issue under its run, not again on its own, and never archived ones', () => {
    const h = home({ issues, routines: [routine('triage', [run('2026-10-27T08:00', 'Filed #0124')])] });
    const own = h.days.flatMap((d) => d.entries).filter((e) => e.kind === 'issue').map((e) => (e.kind === 'issue' ? e.issue.id : ''));
    expect(own).toEqual(['0127']);
  });

  it('finds where an issue came from', () => {
    const rs = [routine('triage', [run('2026-10-27T08:00', 'Filed #0124'), run('2026-10-28T08:00', 'Still open: #0124')])];
    const origins = issueOrigins(issues[0], rs, issues);
    expect(origins.filedBy?.run.at).toContain('2026-10-27');
    expect(origins.mentionedIn.map((e) => e.day)).toEqual(['2026-10-28']);
  });
});

describe('the side column', () => {
  it('describes each routine’s health with its last ten runs, oldest first', () => {
    const many = Array.from({ length: 12 }, (_, n) => run(`2026-10-${String(n + 10).padStart(2, '0')}T08:00`, `Run ${n}`));
    const h = home({
      routines: [
        routine('daily', many),
        routine('paused', [run('2026-10-20T08:00')], { enabled: false, state: 'paused' }),
        routine('busy', [run('2026-10-29T09:00', '', 'running')], { state: 'running' }),
        routine('fresh', []),
        routine('broken', [run('2026-10-29T07:00', 'Timed out', 'failed')]),
      ],
    });
    expect(h.health.map((r) => [r.routine.slug, r.tone, r.label])).toEqual([
      ['daily', 'ok', ''],
      ['paused', 'paused', 'Paused'],
      ['busy', 'running', 'Running'],
      ['fresh', 'none', 'No runs yet'],
      ['broken', 'failed', ''],
    ]);
    expect(h.health[0].strip.map((r) => r.note)).toEqual(['Run 2', 'Run 3', 'Run 4', 'Run 5', 'Run 6', 'Run 7', 'Run 8', 'Run 9', 'Run 10', 'Run 11']);
  });

  it('lists what needs you with reviews first, and the four latest projects not shipped', () => {
    const h = home({
      issues: [
        issue({ id: '0001', assignee: 'human', status: 'todo', created: '2026-10-28' }),
        issue({ id: '0002', assignee: 'human', status: 'in-review', created: '2026-10-01' }),
        issue({ id: '0003', assignee: 'human', status: 'done' }),
        issue({ id: '0004', assignee: 'agent', status: 'todo' }),
      ],
      projects: ['2026-10-01', '2026-10-05', '2026-10-09', '2026-10-12', '2026-10-20'].map((d, n) => project({ slug: `0${n}-p`, lastSession: d, status: n === 4 ? 'shipped' : 'active' })),
    });
    expect(h.needsYou.map((i) => i.id)).toEqual(['0002', '0001']);
    expect(h.projects.map((p) => p.lastSession)).toEqual(['2026-10-12', '2026-10-09', '2026-10-05', '2026-10-01']);
  });
});

describe('what is new since the last visit', () => {
  const input = {
    issues: [issue({ id: '0124', created: '2026-10-29' }), issue({ id: '0120', created: '2026-10-28' })],
    projects: [project({ sessions: [{ date: '2026-10-29', note: 'Kickoff.' }] })],
    routines: [routine('triage', [localRun(28, 8, 'Yesterday'), localRun(29, 8, 'Filed #0124')])],
  };

  it('marks runs after last seen and sessions and issues of a later day, and counts them with filed issues', () => {
    // Last seen at 18:00 local; sessions and issues compare by the local day.
    const h = home({ ...input, lastSeen: new Date(2026, 9, 28, 18).getTime() });
    const marks = h.days.flatMap((d) => d.entries).map((e) => [e.key, e.isNew]);
    expect(marks).toEqual([
      ['r:triage:2026-10-29T0800', true],
      ['s:01-a:2026-10-29', true],
      ['r:triage:2026-10-28T0800', false],
      ['i:0120', false],
    ]);
    expect(h.newCount).toBe(3);
  });

  it('counts the last 24 hours as new when Home was never marked seen', () => {
    const h = home({ ...input, now: new Date(2026, 9, 29, 10).getTime(), lastSeen: null });
    expect(runs(h).map((e) => e.isNew)).toEqual([true, false]);
  });
});

describe('preview links', () => {
  it('names a run by its day and minute and finds it with its neighbours', () => {
    const rs = [routine('triage', [run('2026-10-27T08:00', 'a'), run('2026-10-28T08:00', 'b'), run('2026-10-29T09:53', 'c')])];
    expect(runKey(rs[0].runs[2])).toBe('2026-10-29T0953');
    const found = findRun(rs, 'triage', '2026-10-28T0800');
    expect([found?.run.note, found?.older?.note, found?.newer?.note]).toEqual(['b', 'a', 'c']);
    expect(findRun(rs, 'triage', '2026-10-01T0800')).toBeNull();
  });

  it('round-trips every kind and rejects anything else', () => {
    for (const v of ['run/triage/2026-10-29T0953', 'issue/0124', 'project/06-home', 'routine/triage']) expect(peekValue(parsePeek(v)!)).toBe(v);
    for (const v of ['run/triage', 'issue/12', 'nothing/x', '', undefined, 3]) expect(parsePeek(v)).toBeNull();
  });
});
