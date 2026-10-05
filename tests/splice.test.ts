import { describe, expect, it } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { diffLines } from '../src/diff';
import { spliceMarkdown, splitFrontmatter } from '../src/splice';

const ROOT = join(__dirname, '..');
const doc = `# Title

Intro paragraph with *emphasis*
over two lines.

- [ ] first task
- [x] second task

| a | b |
|---|---|
| 1 | 2 |

<!-- keep me -->

Last paragraph.
`;

// An editor's serializer: same meaning, different bytes everywhere.
const normalized = `# Title

Intro paragraph with _emphasis_ over two lines.

* [ ] first task
* [x] second task

| a | b |
| --- | --- |
| 1 | 2 |

<!-- keep me -->

Last paragraph.
`;

function changedLines(a: string, b: string): string[] {
  return diffLines(a, b).filter((l) => l.kind !== 'same').map((l) => `${l.kind === 'add' ? '+' : '-'}${l.text}`);
}

describe('spliceMarkdown', () => {
  it('returns the original when only formatting changed', () => {
    expect(spliceMarkdown(doc, normalized)).toBe(doc);
  });

  it('changes only the edited block', () => {
    const edited = normalized.replace('* [ ] first task', '* [x] first task');
    expect(changedLines(doc, spliceMarkdown(doc, edited))).toEqual(['-- [ ] first task', '-- [x] second task', '+* [x] first task', '+* [x] second task']);
  });

  it('inserts and deletes blocks with minimal diffs', () => {
    const inserted = normalized.replace('Last paragraph.', 'A new paragraph.\n\nLast paragraph.');
    expect(changedLines(doc, spliceMarkdown(doc, inserted))).toEqual(['+A new paragraph.', '+']);
    const deleted = normalized.replace('<!-- keep me -->\n\n', '');
    expect(changedLines(doc, spliceMarkdown(doc, deleted))).toEqual(['-<!-- keep me -->', '-']);
  });

  it('keeps the original ending when the last block changes', () => {
    expect(spliceMarkdown('Intro.\n\n- [ ] a\n', 'Intro.\n\n- [x] a\n\n')).toBe('Intro.\n\n- [x] a\n');
  });

  it('keeps blocks apart when appending after a paragraph without a blank line', () => {
    expect(spliceMarkdown('One\n', 'One\n\nTwo\n')).toBe('One\n\nTwo\n');
  });

  it('round-trips every markdown file in this repo unchanged', () => {
    const files = execSync('git ls-files "*.md"; find .agents scaffold docs tests/e2e/fixtures -name "*.md"', { cwd: ROOT, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
    for (const f of new Set(files)) {
      const { body } = splitFrontmatter(readFileSync(join(ROOT, f), 'utf8'));
      expect(spliceMarkdown(body, body), f).toBe(body);
      // Whitespace-only differences keep the original bytes.
      expect(spliceMarkdown(body, `${body}\n`), f).toBe(body);
    }
  });
});
