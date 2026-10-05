// WCAG contrast of the token pairs the UI uses, in both themes (#0034).
// Usage: node scripts/contrast.mjs  — exits 1 if a required pair fails AA.
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

function tokens(block) {
  const out = {};
  for (const m of block.matchAll(/--([\w-]+):\s*oklch\(([^)]+)\)/g)) {
    const [l, c, h] = m[2].trim().split(/\s+/).map(Number);
    out[m[1]] = [l, c, h];
  }
  return out;
}

const light = tokens(css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {'))));
const darkStart = css.indexOf(':root[data-theme="dark"]');
const dark = { ...light, ...tokens(css.slice(darkStart, css.indexOf('}', darkStart))) };

function luminance([L, C, H]) {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const [l, m, s] = [l_ ** 3, m_ ** 3, s_ ** 3];
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((v) => Math.min(1, Math.max(0, v)));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

const ratio = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// [foreground, background, minimum] — status/project chips and body text need AA.
const PAIRS = [
  ['ink', 'paper', 4.5], ['ink-2', 'paper', 4.5], ['ink-3', 'paper', 4.5], ['ink-3', 'paper-2', 4.5],
  ['ink-4', 'paper', 3],
  ['ember-deep', 'ember-soft', 4.5], ['ink-blue', 'ink-blue-soft', 4.5], ['moss-deep', 'moss-soft', 4.5],
  ['rose-deep', 'rose-soft', 4.5], ['plum-deep', 'plum-soft', 4.5], ['amber-deep', 'amber-soft', 4.5], ['teal-deep', 'teal-soft', 4.5],
  ['ember-deep', 'paper', 4.5], ['moss-deep', 'paper', 4.5], ['rose', 'paper', 3],
  ['paper', 'ember-deep', 4.5],
];

let failed = 0;
for (const [name, t] of [['light', light], ['dark', dark]]) {
  for (const [fg, bg, min] of PAIRS) {
    const r = ratio(t[fg], t[bg]);
    const ok = r >= min;
    if (!ok) failed++;
    console.log(`${ok ? '✓' : '✗'} ${name.padEnd(5)} ${fg.padEnd(12)} on ${bg.padEnd(14)} ${r.toFixed(2)} (≥ ${min})`);
  }
}
process.exit(failed ? 1 : 0);
