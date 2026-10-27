import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { main } from '../server/cli';

// docs/routines.md documents `routines list --json` and `due --json` field by
// field (#0123): the private dashboard and other tools read them.
function documented(): Record<string, string[]> {
  const doc = readFileSync('docs/routines.md', 'utf8');
  const json = doc.slice(doc.indexOf('## For other tools: the JSON'));
  const out: Record<string, string[]> = {};
  for (const part of json.split(/^#### /m).slice(1)) {
    const [heading, ...lines] = part.split('\n');
    out[heading.trim()] = lines.flatMap((l) => l.match(/^\| `([A-Za-z]+)` \|/)?.[1] ?? []);
  }
  return out;
}

let tmp: string;

async function run(...argv: string[]): Promise<string> {
  const out = vi.spyOn(console, 'log').mockImplementation(() => {});
  try {
    expect(await main(argv)).toBe(0);
    return out.mock.calls.map((c) => c.join(' ')).join('\n');
  } finally {
    out.mockRestore();
  }
}

beforeEach(async () => {
  tmp = await realpath(await mkdtemp(join(tmpdir(), 'loopboard-json-')));
  vi.stubEnv('LOOPBOARD_CONFIG_DIR', join(tmp, 'config'));
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(tmp, { recursive: true, force: true });
});

describe('the documented JSON (#0123)', () => {
  it('names every field list --json and due --json print', async () => {
    const repo = join(tmp, 'shop');
    await mkdir(join(repo, '.agents', 'issues'), { recursive: true });
    const dir = join(repo, '.agents', 'scheduled', 'hourly');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'routine.md'), '---\nschedule: "@hourly"\ntimezone: UTC\n---\n\nSteps.\n');
    const day = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    await writeFile(
      join(dir, 'runs.md'),
      [
        `## x · ok\n- started: ${day}T01:00:04+00:00\n- finished: ${day}T01:05:00+00:00\n- slot: ${day}T01:00:00+00:00\n- host: studio\n\n> Fine.\n`,
        `## x · missed\n- recorded: ${day}T05:00:00+00:00\n- from: ${day}T02:00:00+00:00\n- to: ${day}T04:00:00+00:00\n- slots: 3\n`,
        `## x · expired\n- recorded: ${day}T06:00:00+00:00\n- slot: ${day}T05:00:00+00:00\n`,
      ].join('\n'),
    );
    const books = join(repo, '.agents', 'scheduled', 'books');
    await mkdir(books, { recursive: true });
    await writeFile(join(books, 'routine.md'), '---\nschedule: "@monthly"\ntimezone: UTC\ncreates: issue\nperiod: month\n---\n\nBooks.\n');
    const docs = documented();

    const list = JSON.parse(await run('routines', repo, '--json'));
    expect(Object.keys(list)).toEqual(docs.List);
    expect(Object.keys(list.harnesses[0])).toEqual(docs.Harness);
    const hourly = list.harnesses[0].routines.find((r: { slug: string }) => r.slug === 'hourly');
    expect(Object.keys(hourly)).toEqual(docs.Routine);
    const runKeys = new Set(hourly.runs.flatMap((r: object) => Object.keys(r)));
    expect([...runKeys].sort()).toEqual([...docs.Run].sort());
    expect(Object.keys(hourly.days[0])).toEqual(docs['Graph day']);

    const due = JSON.parse(await run('routines', 'due', repo, '--json', '--dry-run'));
    expect(Object.keys(due)).toEqual(docs.Due);
    expect(Object.keys(due.run[0]).filter((k) => !['slot', 'missed'].includes(k))).toEqual(docs['Due entry']);
    expect(Object.keys(due.filed[0])).toEqual([...docs['Due entry'], 'slot', 'status', 'issue', 'note']);
  });
});
