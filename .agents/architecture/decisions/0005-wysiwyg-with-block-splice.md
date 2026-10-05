# WYSIWYG editing that only re-serializes the blocks you changed

- **Status**: accepted — built in #0024–#0027 (TipTap 3 with `@tiptap/markdown`; "same meaning" = same rendered HTML per top-level block)
- **Date**: 2026-10-04

The maintainer wants Linear-like rich-text editing, but agents author the
same files and markdown serializers normalize list markers, table padding and
escapes — every save would rewrite lines nobody touched. The editor parses the
file into top-level blocks with source offsets; on save only changed blocks
are re-serialized and spliced into the original text, so untouched lines stay
byte-exact. A Source toggle covers blocks that don't round-trip. Frontmatter
is edited through form fields, never the rich-text surface. Saves send the
content hash they started from; a mismatch is a conflict the user resolves
(Reload / Compare / Overwrite) rather than a silent overwrite.

## Considered options

- **Markdown source editor** — byte-exact by nature, less approachable.
- **Accept whole-file normalization** — simplest, but noisy diffs on the
  first edit of every agent-written file.
- **Canonical house format** — reformat everything once; churns every
  adopter's repo and agents drift from the style.
