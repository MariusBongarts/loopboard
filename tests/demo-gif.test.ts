import { describe, expect, it } from 'vitest';
import pngjs from 'pngjs';
import { encodeGif, pickPalette } from '../scripts/demo/gif.mjs';

// The README demo's encoder (#0036).
function png(pixels: number[][]): Buffer {
  const img = new pngjs.PNG({ width: pixels.length, height: 1 });
  pixels.forEach(([r, g, b], i) => img.data.set([r, g, b, 255], i * 4));
  return pngjs.PNG.sync.write(img);
}

// Delay (centiseconds) of every Graphic Control Extension, in order.
function delays(gif: Uint8Array): number[] {
  const out: number[] = [];
  for (let i = 0; i < gif.length - 5; i++) {
    if (gif[i] === 0x21 && gif[i + 1] === 0xf9 && gif[i + 2] === 0x04) out.push(gif[i + 4] | (gif[i + 5] << 8));
  }
  return out;
}

describe('encodeGif', () => {
  it('writes a looping GIF and folds unchanged frames into the previous one', () => {
    const white = [255, 255, 255];
    const violet = [94, 92, 230];
    const gif = encodeGif([
      { png: png([white, white, white, white]), delay: 1000 },
      { png: png([white, violet, white, white]), delay: 300 },
      { png: png([white, violet, white, white]), delay: 200 },
      { png: png([violet, violet, white, white]), delay: 400 },
    ]);

    expect(new TextDecoder().decode(gif.slice(0, 6))).toBe('GIF89a');
    expect(gif[6] | (gif[7] << 8)).toBe(4);
    expect(gif[8] | (gif[9] << 8)).toBe(1);
    expect(new TextDecoder().decode(gif.slice(0, 64))).toContain('NETSCAPE2.0');
    expect(delays(gif)).toEqual([100, 50, 40]);
    expect(gif.at(-1)).toBe(0x3b);
  });

  it('rejects frames of different sizes', () => {
    expect(() => encodeGif([{ png: png([[0, 0, 0]]), delay: 100 }, { png: png([[0, 0, 0], [0, 0, 0]]), delay: 100 }])).toThrow(/expected 1×1/);
  });
});

describe('pickPalette', () => {
  it('keeps flat colours exact and gives a rare hue a slot before near-duplicate shades', () => {
    const counts = new Map<number, number>([[0xffffff, 100_000], [0xfafafa, 50_000], [0x5e5ce6, 12]]);
    for (let i = 0; i < 400; i++) counts.set(0xf0f0f0 - (i % 200) * 0x010101 + (i >= 200 ? 0x000001 : 0), 100);

    const palette = pickPalette(counts).map(([r, g, b]) => (r << 16) | (g << 8) | b);
    expect(palette).toHaveLength(255);
    expect(palette.slice(0, 2)).toEqual([0xffffff, 0xfafafa]);
    expect(palette).toContain(0x5e5ce6);
  });
});
