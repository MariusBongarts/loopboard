// One matcher for issue files (`NNNN-slug.md`) and project folders
// (`NN-slug`). The reader, the workspace counter and the ID allocator share
// it, so they can't disagree about what exists (#0071).

export type IdKind = "issue" | "project";

// `id` is the number the name claims. A near miss looks like an issue or
// project but breaks the pattern; it may carry no number of the right width.
export type NameMatch = { valid: true; id: string } | { valid: false; id: string | null };

const PATTERN: Record<IdKind, RegExp> = {
  issue: /^(\d{4})-[a-z0-9-]+\.md$/,
  project: /^(\d{2})-[a-z0-9-]+$/,
};

// Near misses (capitals, spaces, a sync conflict copy, a wrong digit count):
// a markdown file that starts with a digit, or anything in projects/ that
// isn't hidden, a `_templates`-style folder or a markdown file. A name may
// hold a line break, hence the `s` flag.
const NEAR_MISS: Record<IdKind, RegExp> = {
  issue: /^\d.*\.md$/is,
  project: /^[^._](?!.*\.md$)/is,
};

// In projects/ only a folder takes its number: whoever lists the directory
// leaves out stray files such as `01-notes.txt`.
const NUMBER: Record<IdKind, RegExp> = {
  issue: /^(\d{4})(?!\d)/,
  project: /^(\d{2})(?!\d)/,
};

export const NAME_HINT: Record<IdKind, string> = {
  issue: "name must be NNNN-slug.md (lowercase letters, digits and dashes)",
  project: "folder must be named NN-slug (lowercase letters, digits and dashes)",
};

export function matchName(kind: IdKind, name: string): NameMatch | null {
  const exact = name.match(PATTERN[kind]);
  if (exact) return { id: exact[1], valid: true };
  if (!NEAR_MISS[kind].test(name)) return null;
  return { id: name.match(NUMBER[kind])?.[1] ?? null, valid: false };
}
