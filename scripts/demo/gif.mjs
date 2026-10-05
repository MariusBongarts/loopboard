// Frames → animated GIF for the README demo (#0036). Pure JS, so recording
// needs no ffmpeg. One shared palette avoids flicker; after the first frame
// only changed pixels are stored, unchanged ones are transparent.
import { createRequire } from 'node:module';
import pngjs from 'pngjs';

// gifenc's ESM build exports a different default than its CJS one; require
// gives Node and Vitest the same module.
const { GIFEncoder } = createRequire(import.meta.url)('gifenc');
const { PNG } = pngjs;
const COLORS = 255; // + 1 transparent slot

/**
 * @param {{ png: Buffer, delay: number }[]} frames PNG screenshots, each shown for `delay` ms
 * @returns {Uint8Array}
 */
export function encodeGif(frames) {
  if (!frames.length) throw new Error('encodeGif: no frames');
  const { width, height } = PNG.sync.read(frames[0].png);

  // Every colour that ever appears: all of frame 0, then what each frame changes.
  const counts = new Map();
  let prev = null;
  for (const frame of frames) {
    const { data, width: w, height: h } = PNG.sync.read(frame.png);
    if (w !== width || h !== height) throw new Error(`encodeGif: frame is ${w}×${h}, expected ${width}×${height}`);
    for (let i = 0; i < data.length; i += 4) {
      if (prev && !changed(prev, data, i)) continue;
      const c = rgb(data, i);
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    prev = data;
  }
  const palette = pickPalette(counts);
  const nearest = nearestIn(palette);
  const transparentIndex = palette.length;

  const gif = GIFEncoder();
  let shown = null;
  let pending = null;
  prev = null;
  frames.forEach((frame, n) => {
    const { data } = PNG.sync.read(frame.png);
    const index = new Uint8Array(width * height);
    for (let p = 0, i = 0; p < index.length; p++, i += 4) {
      index[p] = prev && !changed(prev, data, i) ? shown[p] : nearest(rgb(data, i));
    }
    prev = data;
    if (n === 0) {
      pending = { index, delay: frame.delay, first: true };
      shown = index;
      return;
    }
    let any = false;
    const diff = new Uint8Array(index.length);
    for (let p = 0; p < index.length; p++) {
      if (index[p] === shown[p]) diff[p] = transparentIndex;
      else {
        diff[p] = index[p];
        any = true;
      }
    }
    shown = index;
    if (!any) {
      pending.delay += frame.delay;
      return;
    }
    write(gif, pending, width, height, palette, transparentIndex);
    pending = { index: diff, delay: frame.delay, first: false };
  });
  write(gif, pending, width, height, palette, transparentIndex);
  gif.finish();
  return gif.bytes();
}

// Flat colours (backgrounds, borders, body text) stay exact; then the rest by
// frequency, kept apart by a shrinking minimum distance so rarer hues get a
// slot before the thousands of anti-aliasing shades between them.
export function pickPalette(counts) {
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const byCount = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).map(([c]) => c);
  const picked = [];
  const taken = new Set();
  for (const c of byCount) {
    if (picked.length === COLORS / 2 || counts.get(c) < total / 1000) break;
    picked.push(c);
    taken.add(c);
  }
  for (const minDistance of [48, 24, 12, 6, 0]) {
    for (const c of byCount) {
      if (picked.length === COLORS) break;
      if (taken.has(c)) continue;
      if (picked.every((p) => distance(p, c) > minDistance * minDistance)) {
        picked.push(c);
        taken.add(c);
      }
    }
  }
  return picked.map((c) => [c >> 16, (c >> 8) & 255, c & 255]);
}

function nearestIn(palette) {
  const packed = palette.map(([r, g, b]) => (r << 16) | (g << 8) | b);
  const cache = new Map();
  return (c) => {
    let best = cache.get(c);
    if (best !== undefined) return best;
    let bestDistance = Infinity;
    for (let i = 0; i < packed.length; i++) {
      const d = distance(packed[i], c);
      if (d < bestDistance) {
        bestDistance = d;
        best = i;
      }
    }
    cache.set(c, best);
    return best;
  };
}

// Squared RGB distance, weighted towards green like the eye.
function distance(a, b) {
  const dr = (a >> 16) - (b >> 16);
  const dg = ((a >> 8) & 255) - ((b >> 8) & 255);
  const db = (a & 255) - (b & 255);
  return 2 * dr * dr + 4 * dg * dg + 3 * db * db;
}

function rgb(data, i) {
  return (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
}

function changed(before, after, i) {
  return before[i] !== after[i] || before[i + 1] !== after[i + 1] || before[i + 2] !== after[i + 2];
}

function write(gif, frame, width, height, palette, transparentIndex) {
  if (frame.first) {
    gif.writeFrame(frame.index, width, height, { palette: [...palette, [0, 0, 0]], delay: frame.delay });
  } else {
    gif.writeFrame(frame.index, width, height, { delay: frame.delay, transparent: true, transparentIndex, dispose: 1 });
  }
}
