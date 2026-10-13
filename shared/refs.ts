// What counts as a reference to a local issue (#0100): `#NNNN` that doesn't
// directly follow a letter, digit, `#`, `/` or `&`. `shop#0003` is an issue of
// another harness; headings, URL fragments and entities aren't references.
// `check`, `renumber`, issue bodies, notes and phase lists all match with this.

// Group 1 is the character before the `#` (empty at the start), group 2 the
// number. A group, not a lookbehind, which older browsers lack.
export function issueRefSource(id = String.raw`\d{4}`): string {
  return String.raw`(^|[^\w&#/])#(${id})\b`;
}

export interface IssueRef {
  id: string;
  index: number; // of the `#`
}

export function issueRefs(text: string): IssueRef[] {
  return [...text.matchAll(new RegExp(issueRefSource(), 'g'))].map((m) => ({ id: m[2], index: (m.index ?? 0) + m[1].length }));
}
