import type { FC } from 'react';
import { useCurrentFrame } from 'remotion';
import { appear, mix, progress } from '../motion';
import { FONTS, type Theme } from '../tokens';
import { Avatar, Panel, Stage, StatusIcon, useTokens, type Status } from '../ui';

// Chapter 8 — you steer from the board: it follows the files, live.
const COLUMNS: Status[] = ['todo', 'in-progress', 'in-review', 'done'];
const COLUMN_LABEL: Record<string, string> = { todo: 'Todo', 'in-progress': 'In progress', 'in-review': 'In review', done: 'Done' };
const RAIL_W = 190;
const COL_GAP = 12;
const COL_W = (1168 - RAIL_W - 20 - COL_GAP * 3) / 4;
const CARD_H = 92;
const CARD_GAP = 10;
const HEAD = 40;
const MOVE = 24;

type Move = { at: number; col: number; slot: number; who?: 'human' };
type CardDef = { id: string; title: string; col: number; slot: number; moves: Move[]; leaveAt?: number };

const CARDS: CardDef[] = [
  { id: '0063', title: 'Loop diagram on the overview', col: 1, slot: 0, moves: [{ at: 36, col: 3, slot: 0 }, { at: 150, col: 3, slot: 1 }, { at: 256, col: 3, slot: 2 }] },
  { id: '0064', title: 'Render videos with Remotion', col: 0, slot: 0, moves: [{ at: 76, col: 1, slot: 0 }, { at: 150, col: 3, slot: 0 }, { at: 256, col: 3, slot: 1 }] },
  { id: '0065', title: 'Six explainer videos', col: 0, slot: 1, moves: [{ at: 88, col: 0, slot: 0 }, { at: 190, col: 1, slot: 0 }, { at: 256, col: 3, slot: 0 }] },
  { id: '0066', title: 'Course page', col: 0, slot: 2, moves: [{ at: 88, col: 0, slot: 1 }, { at: 202, col: 0, slot: 0 }, { at: 296, col: 1, slot: 0 }, { at: 360, col: 2, slot: 0, who: 'human' }] },
  { id: '0062', title: 'Harness status per repo', col: 3, slot: 0, moves: [{ at: 36, col: 3, slot: 1 }, { at: 150, col: 3, slot: 2 }, { at: 256, col: 3, slot: 3 }] },
  { id: '0061', title: 'Upgrade guide in Help', col: 3, slot: 1, moves: [{ at: 36, col: 3, slot: 2 }, { at: 150, col: 3, slot: 3 }], leaveAt: 250 },
];

function pose(card: CardDef, frame: number) {
  let x = card.col;
  let y = card.slot;
  let col = card.col;
  let who: 'agent' | 'human' = 'agent';
  for (const m of card.moves) {
    const p = progress(frame, m.at, MOVE);
    x = mix(x, m.col, p);
    y = mix(y, m.slot, p);
    if (p > 0.5) {
      col = m.col;
      if (m.who) who = m.who;
    }
  }
  return { x, y, col, who };
}

const Rail: FC = () => {
  const t = useTokens();
  const frame = useCurrentFrame();
  const needs = progress(frame, 372, 12);
  const items = [
    { name: 'Inbox', count: '' },
    { name: 'Needs you', count: needs > 0.5 ? '1' : '' },
    { name: 'Sessions', count: '' },
    { name: 'Issues', count: '' },
  ];
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: RAIL_W, height: 504, display: 'grid', alignContent: 'start', gap: 4, ...appear(frame, 0) }}>
      <div style={{ fontSize: 15, color: t['text-3'], margin: '6px 10px 8px' }}>tracker</div>
      {items.map((it) => {
        const hot = it.name === 'Needs you' && needs > 0;
        return (
          <div
            key={it.name}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 42, padding: '0 12px', borderRadius: 9, fontSize: 19,
              background: hot ? `color-mix(in oklch, ${t['amber-soft']} ${needs * 100}%, transparent)` : 'transparent',
              color: hot ? t['amber-text'] : t['text-2'], fontWeight: hot ? 600 : 400,
            }}
          >
            {it.name}
            {it.count && (
              <span style={{ minWidth: 24, height: 24, display: 'grid', placeItems: 'center', borderRadius: 99, background: t.amber, color: t['on-accent'], fontSize: 14, opacity: needs }}>
                {it.count}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

const BoardCards: FC = () => {
  const t = useTokens();
  const frame = useCurrentFrame();
  const left = RAIL_W + 20;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {COLUMNS.map((c, i) => (
        <div key={c} style={{ position: 'absolute', left: left + i * (COL_W + COL_GAP), top: 0, width: COL_W, height: 504, borderRadius: 14, background: t['bg-hover'], ...appear(frame, 4 + i * 3) }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: HEAD, padding: '0 12px', fontSize: 18, fontWeight: 500, color: t['text-2'] }}>
            <StatusIcon status={c} size={16} /> {COLUMN_LABEL[c]}
          </div>
        </div>
      ))}
      {CARDS.map((card) => {
        const p = pose(card, frame);
        const leave = card.leaveAt ? progress(frame, card.leaveAt, 12) : 0;
        const status = COLUMNS[p.col];
        const review = status === 'in-review';
        return (
          <div
            key={card.id}
            style={{
              position: 'absolute', left: left + p.x * (COL_W + COL_GAP) + 8, top: HEAD + p.y * (CARD_H + CARD_GAP), width: COL_W - 16, height: CARD_H,
              padding: '10px 12px', borderRadius: 11, background: t.surface, border: `1px solid ${review ? t.amber : t.border}`,
              boxShadow: '0 1px 2px oklch(0.2 0.01 286 / 0.07)', display: 'grid', alignContent: 'space-between',
              opacity: (appear(frame, 8).opacity as number) * (1 - leave),
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: FONTS.mono, fontSize: 15, color: t['text-3'] }}>
              <StatusIcon status={status} size={15} />#{card.id}
              <span style={{ marginLeft: 'auto' }}>
                <Avatar who={p.who} size={20} />
              </span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 500, lineHeight: 1.25 }}>{card.title}</div>
          </div>
        );
      })}
    </div>
  );
};

const Review: FC = () => {
  const t = useTokens();
  const frame = useCurrentFrame();
  const open = progress(frame, 440, 20);
  if (open === 0) return null;
  return (
    <Panel style={{ position: 'absolute', right: 0, top: 0, width: 482, height: 504, transform: `translateX(${(1 - open) * 40}px)`, opacity: open }}>
      <div style={{ padding: '18px 22px', display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: FONTS.mono, fontSize: 15, color: t['text-3'] }}>
          <StatusIcon status="in-review" size={16} /> #0066 <Avatar who="human" size={22} />
        </div>
        <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.015em' }}>Course page</div>
        <div style={{ fontSize: 19, fontWeight: 600, marginTop: 6 }}>Review</div>
        <div style={{ fontSize: 19, lineHeight: 1.5, color: t['text-2'] }}>
          Open Help → Working with AI agents in Safari. Check the videos play and follow the theme.
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 8, ...appear(frame, 470) }}>
          <span style={{ padding: '9px 14px', borderRadius: 9, background: t.accent, color: t['on-accent'], fontSize: 16, fontWeight: 500 }}>Mark reviewed</span>
          <span style={{ padding: '9px 14px', borderRadius: 9, border: `1px solid ${t.border}`, fontSize: 16 }}>Copy agent prompt</span>
        </div>
      </div>
    </Panel>
  );
};

export const Board: FC<{ theme: Theme }> = ({ theme }) => (
  <Stage
    theme={theme}
    chapter="You steer from the board"
    captions={[
      { from: 0, text: 'The board follows the files, live.' },
      { from: 150, text: 'You don’t watch the terminal — you watch the work.' },
      { from: 366, text: 'Needs you lists exactly what waits on you.' },
      { from: 440, text: 'Done means verified. Review when you choose.' },
    ]}
  >
    <Rail />
    <BoardCards />
    <Review />
  </Stage>
);
