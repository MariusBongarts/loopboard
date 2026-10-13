import type { FC } from 'react';
import { useCurrentFrame } from 'remotion';
import { appear, mix, progress } from '../motion';
import { FONTS, type Theme } from '../tokens';
import { Avatar, Check, Panel, Stage, useTokens } from '../ui';

// Chapter 1 — agents forget, the repo remembers.
const TALK = [
  { at: 24, who: 'human', text: 'Let’s add a Help Center.' },
  { at: 52, who: 'agent', text: 'Sure. Reading the code…' },
  { at: 80, who: 'human', text: 'Ship the videos as MP4s.' },
  { at: 108, who: 'agent', text: 'Got it. Keep ?from on links?' },
  { at: 136, who: 'human', text: 'Yes. And credit Matt Pocock.' },
] as const;

const TREE = [
  { at: 270, depth: 0, name: 'AGENTS.md', key: 'agents' },
  { at: 282, depth: 0, name: '.agents/', key: '' },
  { at: 294, depth: 1, name: 'skills/', key: '' },
  { at: 306, depth: 1, name: 'projects/03-help-center/', key: '' },
  { at: 318, depth: 2, name: 'prd.md', key: '' },
  { at: 330, depth: 2, name: 'wip.md', key: 'wip' },
  { at: 342, depth: 1, name: 'issues/0061-upgrade-guide.md', key: 'issue' },
  { at: 354, depth: 1, name: 'specs/', key: '' },
] as const;

const READS = [
  { at: 410, text: 'Read AGENTS.md', key: 'agents' },
  { at: 445, text: 'Read wip.md → Current focus', key: 'wip' },
  { at: 480, text: 'Picked #0061 → in-progress', key: 'issue' },
] as const;

const Session: FC = () => {
  const t = useTokens();
  const frame = useCurrentFrame();
  const forget = progress(frame, 176, 26);
  const second = frame >= 204;
  const fill = second ? mix(0, 0.18, progress(frame, 410, 90)) : mix(0, 0.86, progress(frame, 20, 140)) * (1 - forget);
  const hot = progress(frame, 100, 50) * (second ? 0 : 1);
  const barColor = `color-mix(in oklch, ${t.amber} ${Math.round(hot * 100)}%, ${t.accent})`;
  return (
    <Panel title={second ? 'Session 2' : 'Session 1'} style={{ position: 'absolute', left: 0, top: 0, width: 540, height: 430, ...appear(frame, 0) }}>
      <div style={{ padding: '18px 22px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, color: t['text-3'], marginBottom: 8 }}>
          <span>Context window</span>
          <span style={{ fontFamily: FONTS.mono }}>{Math.round(fill * 100)}%</span>
        </div>
        <div style={{ height: 10, borderRadius: 99, background: t['bg-active'], overflow: 'hidden' }}>
          <div style={{ width: `${fill * 100}%`, height: '100%', borderRadius: 99, background: barColor }} />
        </div>
      </div>
      <div style={{ padding: '22px 22px', display: 'grid', gap: 12 }}>
        {!second &&
          TALK.map((m) => (
            <div key={m.at} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 19, ...appear(frame, m.at), opacity: (appear(frame, m.at).opacity as number) * (1 - forget) }}>
              <Avatar who={m.who} size={28} />
              <span style={{ color: m.who === 'human' ? t.text : t['text-2'] }}>{m.text}</span>
            </div>
          ))}
        {second && frame < 400 && (
          <div style={{ marginTop: 120, textAlign: 'center', fontSize: 19, color: t['text-3'], ...appear(frame, 214, { out: 392 }) }}>
            Nothing from session 1 is here.
          </div>
        )}
        {second &&
          READS.map((r) => (
            <div key={r.at} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 19, ...appear(frame, r.at) }}>
              <Avatar who="agent" size={28} />
              <span style={{ color: t['text-2'] }}>{r.text}</span>
              <span style={{ marginLeft: 'auto', opacity: progress(frame, r.at + 14, 10) }}>
                <Check size={20} />
              </span>
            </div>
          ))}
      </div>
    </Panel>
  );
};

const Repo: FC = () => {
  const t = useTokens();
  const frame = useCurrentFrame();
  const lit = (key: string) => READS.find((r) => r.key === key && frame >= r.at);
  return (
    <div style={{ position: 'absolute', left: 600, top: 0, width: 568, ...appear(frame, 256) }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
        <span style={{ fontSize: 22, fontWeight: 600 }}>The repo</span>
        <span style={{ fontSize: 16, color: t['text-3'] }}>survives every session · git keeps the history</span>
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        {TREE.map((n) => {
          const on = n.key ? lit(n.key) : undefined;
          return (
            <div
              key={n.name}
              style={{
                marginLeft: n.depth * 28,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '7px 12px',
                borderRadius: 10,
                fontFamily: FONTS.mono,
                fontSize: 18,
                background: on ? t['accent-soft'] : 'transparent',
                color: on ? t['accent-text'] : n.name.endsWith('/') ? t['text-2'] : t.text,
                ...appear(frame, n.at),
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 2, background: n.name.endsWith('/') ? t['text-4'] : t.accent, opacity: 0.8 }} />
              {n.name}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const Memory: FC<{ theme: Theme }> = ({ theme }) => (
  <Stage
    theme={theme}
    chapter="Agents forget, the repo remembers"
    captions={[
      { from: 0, text: 'Every session starts with an empty context window.' },
      { from: 88, text: 'The fuller it gets, the worse the agent uses it.' },
      { from: 170, text: 'Close the session, and all of it is gone.' },
      { from: 256, text: 'So everything that matters lives in files, in the repo.' },
      { from: 404, text: 'The next session reads them and picks up where the last one stopped.' },
    ]}
  >
    <Session />
    <Repo />
  </Stage>
);
