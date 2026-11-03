import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { main } from '../server/cli';
import { summarizeRoutine } from '../server/dispatch';
import { readRoutine } from '../server/routines';
import { routineDecisions } from '../server/runLog';
import { changedBlock, liveDecisions, parseRunLog } from '../shared/decisions';

// Open decisions in run logs (#0136): read, answer, carry, reject.

let tmp: string;
let repo: string;

async function routine(slug: string, logs: Record<string, string>): Promise<string> {
  const dir = join(repo, '.agents', 'scheduled', slug);
  await mkdir(join(dir, 'log'), { recursive: true });
  await writeFile(join(dir, 'routine.md'), '---\nschedule: "0 8 * * *"\ntimezone: UTC\n---\n\nSteps.\n');
  for (const [file, text] of Object.entries(logs)) await writeFile(join(dir, 'log', file), text);
  return dir;
}

async function run(...argv: string[]): Promise<{ code: number; out: string; err: string }> {
  const out = vi.spyOn(console, 'log').mockImplementation(() => {});
  const err = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const code = await main(argv);
    const text = (calls: unknown[][]) => calls.map((c) => c.join(' ')).join('\n');
    return { code, out: text(out.mock.calls), err: text(err.mock.calls) };
  } finally {
    out.mockRestore();
    err.mockRestore();
  }
}

const today = () => new Date().toISOString().slice(0, 10);

function decision(id: string, state: string, extra = ''): string {
  return [
    `#### ${id} · Ship C?`,
    '',
    `- state: ${state}`,
    '- kind: call',
    `- raised: ${id.slice(-10, -2).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')}`,
    '- options:',
    '  - A: ship C',
    '  - B: run one more',
    '    week',
    '  - C: keep A',
    '- recommended: A — 98% chance best after two',
    '  full weeks',
    ...(extra ? [extra] : []),
  ].join('\n');
}

function section(day: string, decisions: string[], wrote = true): string {
  return [
    `## ${day}`,
    '',
    '```text',
    '📬 1 · something',
    '## not a heading inside the note',
    '```',
    '',
    '### Detail',
    '',
    '- numbers',
    ...(decisions.length ? ['', '### Open decisions', '', decisions.join('\n\n')] : []),
    ...(wrote ? ['', '### Wrote', '', '- `reports/x.md`'] : []),
    '',
  ].join('\n');
}

const log = (...sections: string[]) => ['# Run log: Hero — 2026-10', '', 'Newest on top.', '', ...sections].join('\n');

beforeEach(async () => {
  tmp = await realpath(await mkdtemp(join(tmpdir(), 'loopboard-decisions-')));
  repo = join(tmp, 'shop');
  await mkdir(join(repo, '.agents', 'issues'), { recursive: true });
  vi.stubEnv('LOOPBOARD_CONFIG_DIR', join(tmp, 'config'));
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(tmp, { recursive: true, force: true });
});

describe('reading open decisions', () => {
  it('parses a decision with its options, wrapped lines and recommendation', () => {
    const parsed = parseRunLog(log(section('2026-10-31', [decision('hero-20261031-1', 'open')])));
    expect(parsed.problems).toEqual([]);
    expect(parsed.sections.map((s) => s.heading)).toEqual(['2026-10-31']);
    const [d] = parsed.sections[0].decisions;
    expect(d).toMatchObject({ id: 'hero-20261031-1', question: 'Ship C?', state: 'open', kind: 'call', raised: '2026-10-31', interview: false });
    expect(d.options).toEqual([
      { key: 'A', text: 'ship C' },
      { key: 'B', text: 'run one more week' },
      { key: 'C', text: 'keep A' },
    ]);
    expect(d.recommended).toBe('A — 98% chance best after two full weeks');
  });

  it('takes an id’s newest state and keeps open and answered ones, oldest first', () => {
    const text = log(
      section('2026-10-31', [decision('hero-20261031-1', 'open'), decision('hero-20261029-1', 'applied', '- answer: A · 2026-10-30\n- applied: 2026-10-31 · shipped')]),
      section('2026-10-30', [decision('hero-20261030-1', 'answered', '- answer: B · 2026-10-30'), decision('hero-20261029-1', 'open')]),
    );
    const live = liveDecisions([{ file: 'log/2026-10.md', parsed: parseRunLog(text) }]);
    expect(live.map((d) => [d.id, d.state, d.inNewest])).toEqual([
      ['hero-20261030-1', 'answered', false],
      ['hero-20261031-1', 'open', true],
    ]);
  });

  it('reads the months newest first and puts the live ones on the routine summary', async () => {
    const dir = await routine('hero', {
      '2026-10.md': log(section('2026-10-31', [decision('hero-20261031-1', 'open')])),
      '2026-11.md': log(section('2026-11-01', [decision('hero-20261101-1', 'open')])),
      'notes.md': 'not a month',
    });
    expect(routineDecisions(dir).decisions.map((d) => [d.id, d.file, d.inNewest])).toEqual([
      ['hero-20261031-1', 'log/2026-10.md', false],
      ['hero-20261101-1', 'log/2026-11.md', true],
    ]);
    expect(summarizeRoutine(readRoutine(dir), Date.now()).decisions.map((d) => d.id)).toEqual(['hero-20261031-1', 'hero-20261101-1']);
    const listed = await run('routines', 'decisions', repo, '--json');
    expect(JSON.parse(listed.out).harnesses[0].decisions.map((d: { id: string }) => d.id)).toEqual(['hero-20261031-1', 'hero-20261101-1']);
  });

  it('lists an interview with its brief instead of options', () => {
    const text = log(section('2026-10-31', ['#### seo-20261031-1 · How should the content hold end?\n\n- state: open\n- kind: hold\n- ask: interview\n\nWalk Marius through the three exit paths.']));
    const [d] = parseRunLog(text).sections[0].decisions;
    expect(d).toMatchObject({ interview: true, options: [], brief: 'Walk Marius through the three exit paths.' });
  });
});

describe('recording an answer', () => {
  it('answers in place, then marks it applied, and the decision stops being live', async () => {
    const dir = await routine('hero', { '2026-10.md': log(section('2026-10-31', [decision('hero-20261031-1', 'open')])) });
    const answered = await run('routines', 'answer', 'hero-20261031-1', '--choice', 'b', '--path', repo);
    expect(answered.code).toBe(0);
    expect(answered.out).toContain('recorded hero-20261031-1 answer: B');
    const text = await readFile(join(dir, 'log', '2026-10.md'), 'utf8');
    expect(text).toContain(`- state: answered\n- answer: B · ${today()}\n- kind: call`);
    expect(text).toContain('## not a heading inside the note');

    const again = await run('routines', 'answer', 'hero-20261031-1', '--choice', 'A', '--path', repo);
    expect(again.code).toBe(1);
    expect(again.err).toContain('already answered (B');

    const applied = await run('routines', 'answer', 'hero-20261031-1', '--applied', 'one more week, wait until 11-07', '--path', repo);
    expect(applied.code).toBe(0);
    const done = await readFile(join(dir, 'log', '2026-10.md'), 'utf8');
    expect(done).toContain(`- state: applied\n- answer: B · ${today()}\n- applied: ${today()} · one more week, wait until 11-07`);
    expect(routineDecisions(dir).decisions).toEqual([]);
  });

  it('refuses an option the decision lacks, an apply before the answer and an unknown id', async () => {
    await routine('hero', { '2026-10.md': log(section('2026-10-31', [decision('hero-20261031-1', 'open')])) });
    expect((await run('routines', 'answer', 'hero-20261031-1', '--choice', 'D', '--path', repo)).err).toContain('has no option D; its options are A, B, C');
    expect((await run('routines', 'answer', 'hero-20261031-1', '--applied', 'x', '--path', repo)).err).toContain("isn't answered yet");
    expect((await run('routines', 'answer', 'hero-20261031-9', '--choice', 'A', '--path', repo)).err).toContain('No decision hero-20261031-9');
    expect((await run('routines', 'answer', 'hero-20261031-1', '--path', repo)).err).toContain('Give either --choice');
  });

  it('takes an answer in words, and --dry-run writes nothing', async () => {
    const dir = await routine('hero', { '2026-10.md': log(section('2026-10-31', [decision('hero-20261031-1', 'open')])) });
    const before = await readFile(join(dir, 'log', '2026-10.md'), 'utf8');
    const dry = await run('routines', 'answer', 'hero-20261031-1', '--choice', 'ship C,   but next   week', '--path', repo, '--dry-run');
    expect(dry.out).toContain('would record hero-20261031-1 answer: ship C, but next week');
    expect(await readFile(join(dir, 'log', '2026-10.md'), 'utf8')).toBe(before);
  });
});

describe('carrying an open decision forward', () => {
  it('copies the answered decision into the newest section when a run left it out', async () => {
    const dir = await routine('hero', {
      '2026-10.md': log(section('2026-10-31', []), section('2026-10-30', [decision('hero-20261030-1', 'open')])),
    });
    const res = await run('routines', 'answer', 'hero-20261030-1', '--choice', 'A', '--path', repo);
    expect(res.out).toContain('(carried into the newest section)');
    const parsed = parseRunLog(await readFile(join(dir, 'log', '2026-10.md'), 'utf8'));
    expect(parsed.problems).toEqual([]);
    expect(parsed.sections[0].decisions.map((d) => [d.id, d.state, d.answer])).toEqual([['hero-20261030-1', 'answered', `A · ${today()}`]]);
    expect(parsed.sections[1].decisions.map((d) => d.state)).toEqual(['open']);
    const text = await readFile(join(dir, 'log', '2026-10.md'), 'utf8');
    expect(text.indexOf('### Open decisions')).toBeLessThan(text.indexOf('### Wrote'));
  });

  it('carries across months, into the newest file', async () => {
    const dir = await routine('hero', {
      '2026-10.md': log(section('2026-10-31', [decision('hero-20261031-1', 'open')])),
      '2026-11.md': log(section('2026-11-01', [decision('hero-20261101-1', 'open')], false)),
    });
    await run('routines', 'answer', 'hero-20261031-1', '--choice', 'C', '--path', repo);
    const november = parseRunLog(await readFile(join(dir, 'log', '2026-11.md'), 'utf8'));
    expect(november.sections[0].decisions.map((d) => [d.id, d.state])).toEqual([
      ['hero-20261101-1', 'open'],
      ['hero-20261031-1', 'answered'],
    ]);
    expect(parseRunLog(await readFile(join(dir, 'log', '2026-10.md'), 'utf8')).sections[0].decisions[0].state).toBe('open');
  });

  it('changedBlock keeps the answer when it records the application', () => {
    const block = ['#### a-20261031-1 · Q?', '', '- state: answered', '- answer: A · 2026-10-31', '- kind: call'];
    expect(changedBlock(block, { applied: 'done' }, '2026-11-01')).toEqual([
      '#### a-20261031-1 · Q?',
      '',
      '- state: applied',
      '- answer: A · 2026-10-31',
      '- applied: 2026-11-01 · done',
      '- kind: call',
    ]);
  });
});

describe('rejecting a malformed section', () => {
  it('ignores a section without a date and a decision without a state, and check says so', async () => {
    const text = log(
      section('2026-10-31', [decision('hero-20261031-1', 'open').replace('- state: open\n', ''), decision('hero-20261031-2', 'open')]),
      section('yesterday', [decision('hero-20261030-1', 'open')]),
      section('2026-10-29', ['#### hero-20261029-1 · Two options?\n\n- state: open\n- options:\n  - A: only one\n- recommended: A']),
    );
    const parsed = parseRunLog(text);
    expect(parsed.problems.map((p) => p.message)).toEqual([
      'hero-20261031-1: state is one of open, answered, applied, dropped',
      'the section "yesterday" isn\'t `## YYYY-MM-DD`; its decisions are ignored',
      'hero-20261029-1: two to four lettered options, or `ask: interview` with a brief',
    ]);
    expect(liveDecisions([{ file: 'log/2026-10.md', parsed }]).map((d) => d.id)).toEqual(['hero-20261031-2']);

    await routine('hero', { '2026-10.md': text });
    const check = await run('check', repo);
    expect(check.out).toContain('! scheduled/hero/log/2026-10.md: line');
    expect(check.out).toContain('hero-20261031-1: state is one of');
    expect((await run('routines', 'answer', 'hero-20261030-1', '--choice', 'A', '--path', repo)).err).toContain('No decision hero-20261030-1');
  });

  it('rejects a bad id, a missing answer and a decision twice in one section', () => {
    const parsed = parseRunLog(
      log(
        section('2026-10-31', [
          decision('Hero-1', 'open'),
          decision('hero-20261031-1', 'answered'),
          decision('hero-20261031-2', 'open'),
          decision('hero-20261031-2', 'open'),
        ]),
      ),
    );
    expect(parsed.problems.map((p) => p.message)).toEqual([
      '"Hero-1" is no decision id (<routine>-YYYYMMDD-<n>)',
      'hero-20261031-1: an answered decision needs `- answer:`',
      'hero-20261031-2 appears twice in 2026-10-31',
    ]);
  });
});
