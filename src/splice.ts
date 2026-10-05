import { marked, type Token, type TokensList } from 'marked';

// Block splice for WYSIWYG saves (#0025, ADR-0005). The editor serializes the
// whole document, normalizing formatting along the way; this keeps every
// top-level block whose *rendered meaning* didn't change byte-for-byte from
// the original, and takes only the changed blocks from the editor.

interface Unit {
  text: string; // the block's raw source plus the whitespace after it
  key: string; // what it renders to, normalized — "same meaning" test
  type: string;
}

function normalizeHtml(html: string): string {
  return html.replace(/\s+/g, ' ').replace(/> </g, '><').trim();
}

function units(md: string): { lead: string; units: Unit[] } {
  const tokens = marked.lexer(md);
  let lead = '';
  const out: Unit[] = [];
  for (const token of tokens) {
    if (token.type === 'space') {
      if (out.length) out[out.length - 1].text += token.raw;
      else lead += token.raw;
      continue;
    }
    const one = [token] as unknown as TokensList;
    one.links = tokens.links;
    out.push({ text: token.raw, key: normalizeHtml(marked.parser(one)), type: token.type });
  }
  return { lead, units: out };
}

function lcsTable(a: string[], b: string[]): number[][] {
  const t: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      t[i][j] = a[i] === b[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
    }
  }
  return t;
}

// Appending a block after text that doesn't end in a blank line would glue
// them into one paragraph.
function joinBlock(out: string, next: string): string {
  if (!out || out.endsWith('\n\n')) return out + next;
  return out + (out.endsWith('\n') ? '\n' : '\n\n') + next;
}

export function spliceMarkdown(original: string, edited: string): string {
  if (original === edited) return original;
  const a = units(original);
  const b = units(edited);
  const t = lcsTable(
    a.units.map((u) => u.key),
    b.units.map((u) => u.key),
  );
  let out = a.lead;
  let i = 0;
  let j = 0;
  let lastFromOriginal = true;
  while (i < a.units.length || j < b.units.length) {
    if (i < a.units.length && j < b.units.length && a.units[i].key === b.units[j].key) {
      out = lastFromOriginal ? out + a.units[i].text : joinBlock(out, a.units[i].text);
      lastFromOriginal = true;
      i++;
      j++;
    } else if (j < b.units.length && (i >= a.units.length || t[i][j + 1] >= t[i + 1][j])) {
      out = joinBlock(out, b.units[j].text);
      lastFromOriginal = false;
      j++;
    } else {
      i++; // deleted in the editor
    }
  }
  // The file ends the way it always did, whatever the editor's last block brought.
  return out.replace(/\s*$/, '') + (original.match(/\s*$/)?.[0] ?? '');
}

// Blocks the rich-text editor can't represent faithfully; it shows them as
// read-only raw blocks (edit them in Source).
export const RAW_BLOCK_TYPES = new Set(['html', 'table', 'def']);

export function blockTypes(md: string): string[] {
  return units(md).units.map((u) => u.type);
}

export { splitFrontmatter } from '../shared/frontmatter';

// Raw blocks travel through the rich-text editor as fenced code blocks with
// the info string `loopboard-raw`: visible and editable as source, and
// written back verbatim (#0026).
const RAW_INFO = 'loopboard-raw';

export function toEditorMarkdown(body: string): string {
  const tokens = marked.lexer(body);
  return tokens
    .map((t) => {
      if (!RAW_BLOCK_TYPES.has(t.type)) return t.raw;
      const content = t.raw.replace(/\s+$/, '');
      const trailing = t.raw.slice(content.length) || '\n';
      const longest = Math.max(2, ...[...content.matchAll(/`{3,}/g)].map((m) => m[0].length));
      const fence = '`'.repeat(longest + 1);
      return `${fence}${RAW_INFO}\n${content}\n${fence}${trailing.includes('\n\n') ? trailing : `\n${trailing}`}`;
    })
    .join('');
}

export function fromEditorMarkdown(md: string): string {
  return md.replace(/^(`{3,})loopboard-raw[ \t]*\r?\n([\s\S]*?)\r?\n\1[ \t]*$/gm, (_m, _fence: string, inner: string) => inner);
}
export type { Token };
