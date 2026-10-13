import type { FC } from 'react';
import { useCurrentFrame } from 'remotion';
import { appear, mix, progress } from '../motion';
import type { Theme } from '../tokens';
import { Bubble, Check, Panel, Stage, useTokens } from '../ui';

// Chapter 3 — grill me: one question at a time until no branch is open.
const ROUNDS = [
  { ask: 18, answer: 78, branch: 'Audience', q: 'Who is the Help Center for — newcomers or you?', rec: 'newcomers first', a: 'Newcomers. I know the loop.', resolved: 'newcomers' },
  { ask: 128, answer: 188, branch: 'Videos', q: 'Ship the videos in the app, or link to them?', rec: 'ship them, works offline', a: 'Ship them.', resolved: 'ship MP4s' },
  { ask: 238, answer: 298, branch: 'Player', q: 'Embed the Remotion Player, or render files?', rec: 'render — no license for users', a: 'Render.', resolved: 'render only' },
] as const;
const SLOT = 168;

const Chat: FC = () => {
  const t = useTokens();
  const frame = useCurrentFrame();
  const scroll = mix(0, 90, progress(frame, 232, 20));
  return (
    <Panel title="grill me on the Help Center" style={{ position: 'absolute', left: 0, top: 0, width: 600, height: 500, ...appear(frame, 0) }}>
      <div style={{ position: 'relative', height: 452, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 22, right: 22, top: 20, transform: `translateY(${-scroll}px)` }}>
          {ROUNDS.map((r) => (
            <div key={r.branch} style={{ height: SLOT, display: 'grid', alignContent: 'start', gap: 10 }}>
              <Bubble who="agent" style={appear(frame, r.ask)}>
                <div>{r.q}</div>
                <div style={{ marginTop: 8, fontSize: 15.5, color: t['text-3'], ...appear(frame, r.ask + 18, { rise: 0 }) }}>
                  Recommended: <span style={{ color: t['accent-text'], fontWeight: 500 }}>{r.rec}</span>
                </div>
              </Bubble>
              <Bubble who="human" style={appear(frame, r.answer)}>
                {r.a}
              </Bubble>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
};

const Tree: FC = () => {
  const t = useTokens();
  const frame = useCurrentFrame();
  const rootX = 0;
  const rootW = 150;
  const rootY = 190;
  const nodeX = 200;
  const ys = [60, 190, 320];
  const done = progress(frame, 340, 16);
  return (
    <div style={{ position: 'absolute', left: 660, top: 0, width: 508, height: 504, ...appear(frame, 4) }}>
      <svg width="508" height="420" style={{ position: 'absolute', inset: 0 }}>
        {ys.map((y, i) => {
          const r = ROUNDS[i];
          const resolved = frame >= r.answer + 6;
          const active = frame >= r.ask && !resolved;
          return (
            <path
              key={y}
              d={`M ${rootX + rootW} ${rootY + 24} C ${rootX + rootW + 45} ${rootY + 24}, ${nodeX - 45} ${y + 24}, ${nodeX} ${y + 24}`}
              fill="none"
              stroke={resolved ? t['green'] : active ? t.accent : t['border-strong']}
              strokeWidth={2}
              strokeDasharray={resolved || active ? undefined : '5 6'}
            />
          );
        })}
      </svg>
      <div
        style={{
          position: 'absolute', left: rootX, top: rootY, width: rootW, height: 48, display: 'grid', placeItems: 'center',
          borderRadius: 12, background: t.surface, border: `1px solid ${t.border}`, fontSize: 18, fontWeight: 600,
        }}
      >
        Help Center
      </div>
      {ys.map((y, i) => {
        const r = ROUNDS[i];
        const resolved = progress(frame, r.answer + 6, 12);
        const active = frame >= r.ask && resolved === 0;
        return (
          <div
            key={r.branch}
            style={{
              position: 'absolute', left: nodeX, top: y, width: 308, height: 48, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', whiteSpace: 'nowrap',
              borderRadius: 12, fontSize: 18,
              background: resolved > 0.5 ? t['green-soft'] : t.surface,
              border: `1px ${resolved > 0.5 || active ? 'solid' : 'dashed'} ${resolved > 0.5 ? 'transparent' : active ? t.accent : t['border-strong']}`,
              color: resolved > 0.5 ? t['green-text'] : active ? t.text : t['text-3'],
            }}
          >
            {resolved > 0.5 ? <Check size={20} /> : <span style={{ fontWeight: 600 }}>?</span>}
            <span style={{ fontWeight: 500 }}>{r.branch}</span>
            {resolved > 0.5 && <span style={{ opacity: resolved }}>· {r.resolved}</span>}
          </div>
        );
      })}
      <div
        style={{
          position: 'absolute', left: 0, right: 0, top: 410, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, height: 52,
          borderRadius: 12, background: t['accent-soft'], color: t['accent-text'], fontSize: 20, fontWeight: 600,
          opacity: done, transform: `translateY(${(1 - done) * 8}px)`,
        }}
      >
        <Check size={22} color={t['accent-text']} /> Shared understanding — ready for a PRD
      </div>
    </div>
  );
};

export const Grill: FC<{ theme: Theme }> = ({ theme }) => (
  <Stage
    theme={theme}
    chapter="Grill me"
    captions={[
      { from: 0, text: 'Before any code, the agent interviews you.' },
      { from: 118, text: 'One question at a time, each with a recommended answer.' },
      { from: 300, text: 'Until no branch of the plan is left open.' },
      { from: 400, text: 'Then you both want the same thing.' },
    ]}
  >
    <Chat />
    <Tree />
  </Stage>
);
