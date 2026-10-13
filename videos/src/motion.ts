import type { CSSProperties } from 'react';
import { Easing, interpolate } from 'remotion';

// The Brand Kit's motion: one ease, nothing bounces.
export const EASE = Easing.bezier(0.2, 0, 0, 1);

export function progress(frame: number, start: number, duration: number): number {
  return interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE,
  });
}

export function mix(a: number, b: number, p: number): number {
  return a + (b - a) * p;
}

// Fade in and rise a few pixels; optionally fade out again.
export function appear(frame: number, start: number, opts: { duration?: number; out?: number; rise?: number } = {}): CSSProperties {
  const p = progress(frame, start, opts.duration ?? 14);
  const o = opts.out === undefined ? 0 : progress(frame, opts.out, 10);
  return { opacity: p * (1 - o), transform: `translateY(${(1 - p) * (opts.rise ?? 10)}px)` };
}

export function typed(text: string, frame: number, start: number, perChar = 1.2): string {
  const n = Math.floor(Math.max(0, frame - start) / perChar);
  return text.slice(0, n);
}

export const sec = (s: number, fps = 30) => Math.round(s * fps);
