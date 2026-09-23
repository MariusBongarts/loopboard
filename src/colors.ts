// Per-project + per-label tone identity (#0140). Deterministic hash
// from a slug to one of seven curated tones. Pure, dependency-free,
// stable across reloads — same input always produces the same output
// so a project keeps its colour every time the board mounts.

export const TONES = [
  'ember',
  'blue',
  'moss',
  'rose',
  'plum',
  'amber',
  'teal',
] as const;

export type Tone = typeof TONES[number];

// djb2 — small, well-known, no dependency. Good distribution for the
// short ASCII slugs we feed it (project slugs, label strings).
function djb2(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  return hash;
}

export function slugTone(slug: string): Tone {
  if (!slug) return TONES[0];
  const idx = Math.abs(djb2(slug)) % TONES.length;
  return TONES[idx];
}

// Pre-formatted class string for direct use in :class bindings.
export function toneClass(slug: string): `tone-${Tone}` {
  return `tone-${slugTone(slug)}` as `tone-${Tone}`;
}
