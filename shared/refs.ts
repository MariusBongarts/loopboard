// What counts as a reference to a local issue (#0100): `#NNNN` that doesn't
// directly follow a letter, digit, `#`, `/` or `&`. `shop#0003` is an issue of
// another harness; headings, URL fragments and entities aren't references.
// `check`, `renumber`, issue bodies, notes, phase lists and an issue's commits
// all match with this.

export interface IssueRef {
  id: string;
  index: number; // of the `#`
}

// What may not stand directly before the `#`. Letters and digits of any script.
const QUALIFIER = /[\p{L}\p{N}&#/]$/u;
// Emphasis and code marks don't part a name from its number: `**shop**#0003`
// is as qualified as `shop#0003`, and `**#0003**` as local as `#0003`.
const MARKS = '*_`';

// `before` is the text in front of `text` when a caller matches a fragment
// (a text node after `<strong>shop</strong>`).
export function issueRefs(text: string, before = ''): IssueRef[] {
  const offset = before.length;
  const all = before + text;
  const refs: IssueRef[] = [];
  let end = -1; // where the last reference stopped
  for (const m of all.matchAll(/#(\d{4})\b/g)) {
    const index = m.index ?? 0;
    let at = index;
    while (at > 0 && MARKS.includes(all[at - 1])) at--;
    // `#0061/#0062` names two issues; `example.com/#0062` names none.
    const listed = all[index - 1] === '/' && index - 1 === end;
    if (!listed && QUALIFIER.test(all.slice(Math.max(0, at - 2), at))) continue;
    end = index + m[0].length;
    if (index >= offset) refs.push({ id: m[1], index: index - offset });
  }
  return refs;
}

// Rewrites every local reference to `from`; `shop#0001` stays.
export function replaceIssueRefs(text: string, from: string, to: string): string {
  let out = '';
  let last = 0;
  for (const { id, index } of issueRefs(text)) {
    if (id !== from) continue;
    out += `${text.slice(last, index)}#${to}`;
    last = index + 1 + id.length;
  }
  return out + text.slice(last);
}

// A path to an issue file of this root, as a WIP or PRD links it:
// `../../issues/0003-pay.md`. One that passes through another folder
// (`../../../shop/.agents/issues/0003-pay.md`) is another harness's issue.
const LOCAL_ISSUE_PATH = /^\/?(?:\.\.?\/)*(?:(?:\.agents|ai)\/)?issues\/(?:_archive\/)?(\d{4})-/;
const ISSUE_PATH = /[^\s()<>[\]"']*issues\/(?:_archive\/)?\d{4}-[^\s()<>[\]"']*/g;

export function localIssuePath(path: string): string | null {
  return path.match(LOCAL_ISSUE_PATH)?.[1] ?? null;
}

// The local issue files a text links or names, by position.
export function issuePathRefs(text: string): IssueRef[] {
  const refs: IssueRef[] = [];
  for (const m of text.matchAll(ISSUE_PATH)) {
    const id = localIssuePath(m[0]);
    if (id) refs.push({ id, index: m.index ?? 0 });
  }
  return refs;
}
