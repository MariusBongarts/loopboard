import type { FC } from 'react';
import { useCurrentFrame } from 'remotion';
import { appear, progress } from '../motion';
import type { Theme } from '../tokens';
import { Check, Stage, useTokens } from '../ui';

// Chapter 5 — horizontal layers vs vertical slices (tracer bullets).
const LAYERS = ['UI', 'API', 'Data', 'Tests'];
const SLICES = ['Sidebar nav', 'Copy prompt', 'Harness table', 'Videos'];
const LABEL_W = 110;
const GRID_W = 1168 - LABEL_W;
const ROW_H = 78;
const GAP = 12;
const TOP = 70;
const COL_GAP = 14;
const COL_W = (GRID_W - COL_GAP * 3) / 4;

const H_START = 24;
const H_STEP = 50;
const V_START = 300;
const V_STEP = 66;

export const Slices: FC<{ theme: Theme }> = ({ theme }) => (
  <Stage
    theme={theme}
    chapter="Thin vertical slices"
    captions={[
      { from: 0, text: 'Cut work by layer, and nothing works until the end.' },
      { from: 262, text: 'Cut it into vertical slices instead — tracer bullets.' },
      { from: 380, text: 'Each goes through every layer and works on its own.' },
      { from: 520, text: 'Small enough for one session. Easy to check.' },
    ]}
  >
    <Grid />
  </Stage>
);

const Grid: FC = () => {
  const t = useTokens();
  const frame = useCurrentFrame();
  const vertical = frame >= 262;
  const reset = progress(frame, 238, 20);
  const hDone = frame >= H_START + LAYERS.length * H_STEP;
  const working = vertical ? SLICES.filter((_, k) => frame >= V_START + k * V_STEP + 40).length : hDone ? 4 : 0;
  const title = vertical ? 'Slice by slice' : 'Layer by layer';
  const chipTone = vertical ? (working ? 'green' : 'muted') : hDone ? 'amber' : 'red';
  const chipBg = { green: t['green-soft'], amber: t['amber-soft'], red: t['red-soft'], muted: t['bg-hover'] }[chipTone];
  const chipFg = { green: t['green-text'], amber: t['amber-text'], red: t['red-text'], muted: t['text-2'] }[chipTone];
  const chipText = vertical
    ? `Working end to end: ${working} of 4`
    : hDone
      ? 'Working: 4 of 4 — all at the very end'
      : 'Working end to end: 0 of 4';

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', left: 0, top: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span key={title} style={{ fontSize: 24, fontWeight: 600, ...appear(frame, vertical ? 262 : 0) }}>{title}</span>
        <span style={{ padding: '8px 14px', borderRadius: 99, background: chipBg, color: chipFg, fontSize: 18, fontWeight: 500 }}>{chipText}</span>
      </div>

      {LAYERS.map((layer, r) => (
        <div
          key={layer}
          style={{
            position: 'absolute', left: 0, top: TOP + r * (ROW_H + GAP), width: LABEL_W - 16, height: ROW_H,
            display: 'flex', alignItems: 'center', fontSize: 20, fontWeight: 500, color: t['text-2'],
          }}
        >
          {layer}
        </div>
      ))}

      {/* Empty cells */}
      {LAYERS.map((_, r) =>
        SLICES.map((__, c) => (
          <div
            key={`${r}-${c}`}
            style={{
              position: 'absolute', left: LABEL_W + c * (COL_W + COL_GAP), top: TOP + r * (ROW_H + GAP), width: COL_W, height: ROW_H,
              borderRadius: 12, background: t.surface, border: `1px solid ${t.border}`,
            }}
          />
        )),
      )}

      {/* Horizontal: whole layers fill one after another */}
      {!vertical &&
        LAYERS.map((layer, r) => {
          const p = progress(frame, H_START + r * H_STEP, H_STEP - 6);
          return (
            <div
              key={layer}
              style={{
                position: 'absolute', left: LABEL_W, top: TOP + r * (ROW_H + GAP), width: GRID_W * p, height: ROW_H,
                borderRadius: 12, background: t['accent-soft'], border: p > 0 ? `1px solid ${t.accent}` : 'none',
                opacity: 1 - reset,
              }}
            />
          );
        })}

      {/* Vertical: one slice through every layer at a time */}
      {vertical &&
        SLICES.map((name, c) => {
          const start = V_START + c * V_STEP;
          const left = LABEL_W + c * (COL_W + COL_GAP);
          const ok = progress(frame, start + 40, 12);
          return (
            <div key={name}>
              {LAYERS.map((layer, r) => {
                const p = progress(frame, start + r * 7, 12);
                return (
                  <div
                    key={layer}
                    style={{
                      position: 'absolute', left, top: TOP + r * (ROW_H + GAP), width: COL_W, height: ROW_H,
                      borderRadius: 12, background: ok > 0.5 ? t['green-soft'] : t['accent-soft'],
                      border: `1px solid ${ok > 0.5 ? t.green : t.accent}`, opacity: p, transform: `scaleY(${0.6 + 0.4 * p})`,
                    }}
                  />
                );
              })}
              <div
                style={{
                  position: 'absolute', left, top: TOP + 4 * (ROW_H + GAP) + 4, width: COL_W, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontSize: 18, fontWeight: 500, color: ok > 0.5 ? t['green-text'] : t['text-2'], opacity: progress(frame, start, 12),
                }}
              >
                {ok > 0.5 && <Check size={20} />} #{c + 1} {name}
              </div>
            </div>
          );
        })}
    </div>
  );
};
