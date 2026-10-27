import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildBrief, dispatcherPrompt } from '../server/brief';
import { main } from '../server/cli';
import { startRun } from '../server/dispatch';
import { readRoutine } from '../server/routines';

let tmp: string;
let repo: string;
const t = (iso: string) => Date.parse(iso);

async function routine(slug: string, frontmatter: string, body: string, runs?: string): Promise<string> {
  const dir = join(repo, '.agents', 'scheduled', slug);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'routine.md'), `---\n${frontmatter.trim()}\n---\n\n${body}`);
  if (runs !== undefined) await writeFile(join(dir, 'runs.md'), runs);
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

beforeEach(async () => {
  tmp = await realpath(await mkdtemp(join(tmpdir(), 'loopboard-brief-')));
  repo = join(tmp, 'Web Shop');
  await mkdir(join(repo, '.agents', 'issues'), { recursive: true });
  await writeFile(join(repo, '.agents', 'harness.md'), '---\nschema: 1\nid: shop\nname: Web Shop\nkind: harness\n---\n\n<!-- One paragraph. -->\n\nThe shop: storefront, checkout and the newsletter.\n\nMore text.\n');
  vi.stubEnv('LOOPBOARD_CONFIG_DIR', join(tmp, 'config'));
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(tmp, { recursive: true, force: true });
});

const RUNS = ['ok', 'failed', 'aborted', 'ok']
  .map((status, i) => `## 2026-10-2${i + 1} 07:30 · ${status}\n- started: 2026-10-2${i + 1}T07:30:00+02:00\n- finished: 2026-10-2${i + 1}T07:40:00+02:00\n\n> Note ${i + 1}.\n> Second line ${i + 1}.\n`)
  .join('\n');

describe('the brief (#0119)', () => {
  it('holds the routine, the harness, the last three notes, the rules and the finish commands', async () => {
    const leben = join(tmp, 'leben');
    const dir = await routine('weekly', 'title: Weekly report\nschedule: "30 7 * * 1"\ntimezone: Europe/Berlin\nwrites-to: [leben, steuern]', 'Write reports/{date}.md.\n', RUNS);
    await startRun(dir, t('2026-10-26T06:30:04Z'), { host: 'studio' });
    const brief = buildBrief(readRoutine(dir), [{ id: 'leben', name: 'leben', repoPath: leben, root: join(leben, '.agents') }]);
    expect(brief).toContain('# Routine: Weekly report');
    expect(brief).toContain('You are running the routine "Weekly report" (`weekly`) of the harness Web Shop (`shop`), unattended');
    expect(brief).toContain(`- Working directory: ${repo}`);
    expect(brief).toContain('- Schedule: Mondays at 07:30 (Europe/Berlin); this run is for the slot of 2026-10-26 07:30.');
    expect(brief).toContain('- Started: 2026-10-26 07:30 on studio');
    expect(brief).toContain('The shop: storefront, checkout and the newsletter.');
    expect(brief).not.toContain('More text.');
    expect(brief).toContain(`Read \`AGENTS.md\` in ${repo} first`);
    expect(brief).toContain('## Steps\n\nWrite reports/{date}.md.');
    expect(brief).toContain('## What earlier runs noted\n\n- 2026-10-24 07:30 · ok — Note 4.\n  Second line 4.\n- 2026-10-23 07:30 · aborted — Note 3.\n  Second line 3.\n- 2026-10-22 07:30 · failed — Note 2.\n  Second line 2.\n');
    expect(brief).not.toContain('Note 1.');
    expect(brief).toContain(`write only to it and to \`leben\` (${leben}), \`steuern\` (not registered on this machine)`);
    expect(brief).toContain('2. Never commit, push or publish.');
    expect(brief).toContain('3. Never send anything');
    expect(brief).toContain(`    loopboard routines finish '${dir}' --status ok --note "<your note>"`);
    expect(brief).toContain(`    loopboard routines finish '${dir}' --status failed --note "<what went wrong>"`);
  });

  it('says so on a first run, and sends a creates: issue routine to start', async () => {
    const first = await routine('first', 'schedule: "@daily"', 'Do it.\n');
    expect(buildBrief(readRoutine(first), [])).toContain("## What earlier runs noted\n\nThis is the routine's first run.");
    expect(buildBrief(readRoutine(first), [])).toContain('Work in this harness and write only to it.');
    const books = await routine('books', 'schedule: "@monthly"\ncreates: issue\nperiod: month', 'Books.\n');
    const brief = buildBrief(readRoutine(books), []);
    expect(brief).toContain('there is nothing for an agent to do');
    expect(brief).not.toContain('## Finish');
  });

  it('prints through loopboard routines prompt', async () => {
    await routine('daily', 'schedule: "@daily"', 'Do it.\n');
    const r = await run('routines', 'prompt', 'daily', '--path', repo);
    expect(r.code).toBe(0);
    expect(r.out).toContain('# Routine: daily');
  });
});

describe('the dispatcher prompt (#0119)', () => {
  it('fills in the scope of one harness or of a folder', async () => {
    const doc = readFileSync('docs/dispatcher-prompt.md', 'utf8');
    expect(doc).toContain('{{SCOPE}}');
    const one = dispatcherPrompt({ path: repo });
    expect(one).toContain(`You are the routine dispatcher for the harness at ${repo}.`);
    expect(one).toContain(`Run \`loopboard routines due '${repo}' --json\``);
    expect(one).not.toContain('{{');
    const tree = await run('routines', 'dispatcher-prompt', '--under', tmp);
    expect(tree.out).toContain(`dispatcher for every harness under ${tmp}.`);
    expect(tree.out).toContain(`loopboard routines due --under ${tmp} --json`);
    for (const rule of ['one after another, never in parallel', 'fresh context', 'push notification', 'Never send email', 'Never commit']) {
      expect(tree.out).toContain(rule);
    }
  });

  it('ships with the package', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { files: string[] };
    expect(pkg.files).toContain('docs/dispatcher-prompt.md');
  });
});
