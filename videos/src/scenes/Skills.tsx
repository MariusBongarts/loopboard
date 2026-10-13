import type { FC } from 'react';
import { useCurrentFrame } from 'remotion';
import { appear, mix, progress, typed } from '../motion';
import { FONTS, type Theme } from '../tokens';
import { Bubble, Check, FileChip, Panel, Stage, useTokens } from '../ui';

// Chapter 2 — skills: descriptions always, the whole file only when it fits.
const SKILLS = [
  { name: 'grill-me', about: 'Interview me about a plan until it’s clear' },
  { name: 'to-prd', about: 'Turn the conversation into a PRD and a project' },
  { name: 'to-issues', about: 'Break a PRD into vertical-slice issues' },
  { name: 'implement', about: 'Take one issue through the session loop' },
  { name: 'tdd', about: 'Red, green, refactor — one behavior at a time' },
  { name: 'triage', about: 'Move issues between statuses and assignees' },
];
const MATCH = 1;
const SCAN_START = 96;
const SCAN_STEP = 13;

const BODY = ['# To PRD', '1. Explore the repo', '2. Sketch the modules', '3. Pick the project number', '4. Create the project folder', '5. Fill the PRD, then hand off'];

const Chat: FC = () => {
  const t = useTokens();
  const frame = useCurrentFrame();
  const ask = 'write a PRD for this';
  return (
    <Panel title="Your agent" style={{ position: 'absolute', left: 0, top: 0, width: 500, height: 500, ...appear(frame, 0) }}>
      <div style={{ padding: 22, display: 'grid', gap: 18 }}>
        <Bubble who="human" style={appear(frame, 8)}>
          {typed(ask, frame, 14, 1.6)}
          <span style={{ opacity: frame < 50 && Math.floor(frame / 8) % 2 === 0 ? 1 : 0 }}>▍</span>
        </Bubble>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 17, color: t['text-3'], ...appear(frame, 196) }}>
          <span style={{ padding: '4px 10px', borderRadius: 99, background: t['accent-soft'], color: t['accent-text'], fontFamily: FONTS.mono, fontSize: 17 }}>
            skill: to-prd
          </span>
          matched
        </div>
        <div style={{ fontSize: 18, color: t['text-2'], ...appear(frame, 300) }}>Reading the conversation and the code…</div>
        <div style={{ fontSize: 18, color: t['text-2'], ...appear(frame, 350) }}>Writing the PRD and the WIP…</div>
        <div style={{ display: 'grid', gap: 10, marginTop: 6 }}>
          {['projects/03-help-center/prd.md', 'projects/03-help-center/wip.md'].map((p, i) => (
            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, ...appear(frame, 410 + i * 14) }}>
              <FileChip path={p} tone="accent" style={{ fontSize: 17 }} />
              <Check />
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
};

const Library: FC = () => {
  const t = useTokens();
  const frame = useCurrentFrame();
  const scanIndex = Math.min(MATCH, Math.max(-1, Math.floor((frame - SCAN_START) / SCAN_STEP)));
  const scanning = frame >= SCAN_START && frame < SCAN_START + 6 * SCAN_STEP;
  const settle = frame >= SCAN_START + (MATCH + 1) * SCAN_STEP;
  const open = progress(frame, 262, 22);
  return (
    <div style={{ position: 'absolute', left: 560, top: 0, width: 608, height: 504 }}>
      <div style={{ fontSize: 17, color: t['text-3'], marginBottom: 12, ...appear(frame, 80) }}>
        {open > 0.5 ? 'Loaded only now — the whole file' : 'Always in context — one line each'}
      </div>
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'grid', gap: 8, opacity: 1 - open }}>
          {SKILLS.map((s, i) => {
            const hit = settle && i === MATCH;
            const looking = scanning && !settle && i === scanIndex;
            return (
              <div
                key={s.name}
                style={{
                  padding: '9px 16px',
                  borderRadius: 12,
                  background: t.surface,
                  border: `1px solid ${hit ? t.accent : looking ? t['border-strong'] : t.border}`,
                  boxShadow: hit ? `0 0 0 3px ${t['accent-soft']}` : 'none',
                  ...appear(frame, 84 + i * 4),
                }}
              >
                <div style={{ fontFamily: FONTS.mono, fontSize: 19, fontWeight: 500, color: hit ? t['accent-text'] : t.text }}>{s.name}</div>
                <div style={{ fontSize: 17, color: t['text-3'], marginTop: 2 }}>{s.about}</div>
              </div>
            );
          })}
        </div>
        {open > 0 && (
          <Panel style={{ position: 'absolute', inset: 0, height: 470, opacity: open, transform: `translateY(${mix(10, 0, open)}px)` }}>
            <div style={{ padding: '16px 20px', fontFamily: FONTS.mono, fontSize: 19, lineHeight: 1.6 }}>
              <div style={{ color: t['text-3'] }}>---</div>
              <div>
                <span style={{ color: t['text-3'] }}>name:</span> <span style={{ color: t['accent-text'] }}>to-prd</span>
              </div>
              <div>
                <span style={{ color: t['text-3'] }}>description:</span> Turn the conversation into a PRD…
              </div>
              <div style={{ color: t['text-3'], marginBottom: 10 }}>---</div>
              {BODY.map((line, i) => (
                <div key={line} style={{ color: i === 0 ? t.text : t['text-2'], fontWeight: i === 0 ? 600 : 400, ...appear(frame, 284 + i * 12) }}>
                  {line}
                </div>
              ))}
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
};

export const Skills: FC<{ theme: Theme }> = ({ theme }) => (
  <Stage
    theme={theme}
    chapter="Skills"
    captions={[
      { from: 0, text: 'You ask in plain words.' },
      { from: 84, text: 'The agent keeps every skill’s one-line description in mind.' },
      { from: 262, text: 'When one fits, it reads the whole SKILL.md and follows it.' },
      { from: 404, text: 'Same request, same process, every time.' },
    ]}
  >
    <Chat />
    <Library />
  </Stage>
);
