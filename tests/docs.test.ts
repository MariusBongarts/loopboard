import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hashContent, readDoc, writeDoc } from '../server/docs';

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'loopboard-docs-'));
  await mkdir(join(root, 'issues'));
  await writeFile(join(root, 'issues', '0001-a.md'), 'v1\n');
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('document store', () => {
  it('reads with a hash and writes when the base hash matches', async () => {
    const doc = await readDoc(root, 'issues/0001-a.md');
    expect(doc).toEqual({ path: 'issues/0001-a.md', content: 'v1\n', hash: hashContent('v1\n') });
    const saved = await writeDoc(root, 'issues/0001-a.md', 'v2\n', doc.hash);
    expect(saved.hash).toBe(hashContent('v2\n'));
    expect(await readFile(join(root, 'issues', '0001-a.md'), 'utf8')).toBe('v2\n');
    expect(await readdir(join(root, 'issues'))).toEqual(['0001-a.md']);
  });

  it('refuses a stale save with the current content', async () => {
    const doc = await readDoc(root, 'issues/0001-a.md');
    await writeFile(join(root, 'issues', '0001-a.md'), 'agent edit\n');
    await expect(writeDoc(root, 'issues/0001-a.md', 'mine\n', doc.hash)).rejects.toMatchObject({
      statusCode: 409,
      current: { content: 'agent edit\n', hash: hashContent('agent edit\n') },
    });
    expect(await readFile(join(root, 'issues', '0001-a.md'), 'utf8')).toBe('agent edit\n');
  });

  it('only serves markdown inside the root', async () => {
    await expect(readDoc(root, '../outside.md')).rejects.toMatchObject({ statusCode: 400 });
    await expect(readDoc(root, '/etc/passwd.md')).rejects.toMatchObject({ statusCode: 400 });
    await expect(readDoc(root, 'issues/0001-a.txt')).rejects.toMatchObject({ statusCode: 400 });
    await expect(readDoc(root, 'issues/0002-missing.md')).rejects.toMatchObject({ statusCode: 404 });
  });
});
