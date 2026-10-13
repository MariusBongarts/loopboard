import type { FC } from 'react';
import { useCurrentFrame } from 'remotion';
import { appear } from '../motion';
import { FONTS, type Theme } from '../tokens';
import { Avatar, Check, Panel, Stage, StatusIcon, useTokens, type Status } from '../ui';

// Chapter 6 — the issue loop: the issue file changes as the agent works.
const STEPS = ['Pick a todo → in-progress', 'Build the slice end to end', 'Run verify', 'Done — or in review', 'Write it down in wip.md'];

type Pass = {
  start: number;
  file: string;
  title: string;
  criteria: string[];
  steps: number[]; // frame each step starts
  verify: string[];
  human: boolean;
};

const PASSES: Pass[] = [
  {
    start: 0,
    file: '0061-upgrade-guide-in-help.md',
    title: 'Upgrade guide in Help',
    criteria: ['Prompts are copyable', 'Real path filled in'],
    steps: [20, 92, 168, 248, 292],
    verify: ['$ pnpm verify', '✓ types', '✓ 241 tests', '✓ contrast'],
    human: false,
  },
  {
    start: 360,
    file: '0066-working-with-ai-course.md',
    title: 'Course page',
    criteria: ['Chapters with videos', 'Videos play in Safari'],
    steps: [384, 432, 470, 520, 592],
    verify: ['$ pnpm verify', '✓ types', '✓ 247 tests', '✓ contrast'],
    human: true,
  },
];

function current(frame: number): Pass {
  return frame >= PASSES[1].start ? PASSES[1] : PASSES[0];
}

function statusOf(p: Pass, frame: number): Status {
  if (frame >= p.steps[3] + 8) return p.human ? 'in-review' : 'done';
  if (frame >= p.steps[0] + 16) return 'in-progress';
  return 'todo';
}

const IssueFile: FC = () => {
  const t = useTokens();
  const frame = useCurrentFrame();
  const p = current(frame);
  const swap = p.start ? appear(frame, p.start + 4) : appear(frame, 0);
  const status = statusOf(p, frame);
  const human = p.human && frame >= p.steps[3] + 8;
  const changed = (at: number) => frame >= at && frame < at + 30;
  const line = (k: string, v: string, at: number) => (
    <div style={{ display: 'flex', gap: 10, padding: '1px 6px', margin: '0 -6px', borderRadius: 6, background: changed(at) ? t['accent-soft'] : 'transparent' }}>
      <span style={{ color: t['text-3'] }}>{k}:</span>
      <span style={{ color: t.text }}>{v}</span>
    </div>
  );
  return (
    <Panel title={p.file} style={{ position: 'absolute', left: 0, top: 0, width: 430, height: 470, ...appear(frame, 0) }}>
      <div style={{ padding: '16px 20px', fontFamily: FONTS.mono, fontSize: 19, lineHeight: 1.7, ...swap }}>
        <div style={{ color: t['text-3'] }}>---</div>
        {line('title', p.title, -100)}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '1px 6px', margin: '0 -6px', borderRadius: 6, background: changed(p.steps[0] + 16) || changed(p.steps[3] + 8) ? t['accent-soft'] : 'transparent' }}>
          <span style={{ color: t['text-3'] }}>status:</span>
          <StatusIcon status={status} size={16} />
          <span>{status}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '1px 6px', margin: '0 -6px', borderRadius: 6, background: changed(p.steps[3] + 8) && p.human ? t['accent-soft'] : 'transparent' }}>
          <span style={{ color: t['text-3'] }}>assignee:</span>
          <Avatar who={human ? 'human' : 'agent'} size={20} />
          <span>{human ? 'human' : 'agent'}</span>
        </div>
        <div style={{ color: t['text-3'] }}>---</div>
        <div style={{ marginTop: 8, fontWeight: 600 }}>## Acceptance criteria</div>
        {p.criteria.map((c, i) => {
          const ticked = frame >= p.steps[1] + 20 + i * 18;
          return (
            <div key={c} style={{ color: ticked ? t.text : t['text-2'] }}>
              - [{ticked ? 'x' : ' '}] {c}
            </div>
          );
        })}
        {p.human && (
          <div style={{ marginTop: 8, ...appear(frame, p.steps[3] + 14) }}>
            <div style={{ fontWeight: 600, color: t['amber-text'] }}>## Review</div>
            <div style={{ color: t['text-2'], fontFamily: FONTS.sans, fontSize: 19, lineHeight: 1.45 }}>Check the videos play in Safari.</div>
          </div>
        )}
      </div>
    </Panel>
  );
};

const Steps: FC = () => {
  const t = useTokens();
  const frame = useCurrentFrame();
  const p = current(frame);
  const active = p.steps.reduce((acc, at, i) => (frame >= at ? i : acc), -1);
  return (
    <div style={{ position: 'absolute', left: 456, top: 6, width: 340, display: 'grid', gap: 10, ...appear(frame, 6) }}>
      <div style={{ fontSize: 18, fontFamily: FONTS.mono, color: t['text-3'], marginBottom: 4 }}>implement</div>
      {STEPS.map((s, i) => {
        const on = i === active;
        const done = i < active;
        const label = i === 3 && p.human && frame >= p.steps[3] ? 'In review — for you' : s;
        return (
          <div
            key={s}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 14px', borderRadius: 12, fontSize: 19.5,
              background: on ? t['accent-soft'] : t.surface, border: `1px solid ${on ? t.accent : t.border}`,
              color: on ? t['accent-text'] : done ? t.text : t['text-3'],
            }}
          >
            <span
              style={{
                display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: 99, flex: 'none', fontSize: 14, fontWeight: 600,
                background: done ? t['green-soft'] : on ? t.accent : t['bg-hover'], color: done ? t['green-text'] : on ? t['on-accent'] : t['text-3'],
              }}
            >
              {done ? <Check size={16} /> : i + 1}
            </span>
            {label}
          </div>
        );
      })}
    </div>
  );
};

const Terminal: FC = () => {
  const t = useTokens();
  const frame = useCurrentFrame();
  const p = current(frame);
  const wip = p.steps[4] + 6;
  return (
    <Panel title="terminal" style={{ position: 'absolute', left: 822, top: 0, width: 346, height: 470, ...appear(frame, 10) }}>
      <div key={p.file} style={{ padding: '16px 18px', fontFamily: FONTS.mono, fontSize: 19, lineHeight: 1.75 }}>
        {p.verify.map((l, i) => (
          <div key={l} style={{ color: i === 0 ? t.text : t['green-text'], ...appear(frame, p.steps[2] + 6 + i * 14, { rise: 0 }) }}>
            {l}
          </div>
        ))}
        <div style={{ marginTop: 18, padding: '10px 12px', borderRadius: 10, background: t['bg-subtle'], border: `1px solid ${t.border}`, fontFamily: FONTS.sans, fontSize: 18, lineHeight: 1.45, ...appear(frame, wip) }}>
          <div style={{ fontFamily: FONTS.mono, fontSize: 15, color: t['text-3'] }}>wip.md · activity log</div>
          <div style={{ color: t.text, marginTop: 4 }}>
            #{p.file.slice(0, 4)} {p.human ? 'built; waits on your check' : 'done'}
          </div>
        </div>
      </div>
    </Panel>
  );
};

export const Loop: FC<{ theme: Theme }> = ({ theme }) => (
  <Stage
    theme={theme}
    chapter="The issue loop"
    captions={[
      { from: 0, text: '“Implement #0061”: one issue, end to end.' },
      { from: 164, text: 'Then the verify command decides.' },
      { from: 246, text: 'Passed, and every criterion met: done.' },
      { from: 360, text: 'Next issue — the same loop.' },
      { from: 516, text: 'Needs a check the agent can’t do? In review, assigned to you.' },
      { from: 604, text: 'Every pass is small, verified and written down.' },
    ]}
  >
    <IssueFile />
    <Steps />
    <Terminal />
  </Stage>
);
