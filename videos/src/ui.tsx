import { createContext, useContext, useEffect, useState, type CSSProperties, type FC, type ReactNode } from 'react';
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from 'remotion';
import { progress } from './motion';
import { FONTS, TOKENS, type Theme, type Tokens } from './tokens';

// Shared building blocks for the explainer videos, drawn in the app's own
// tokens so a video looks like loopboard in either theme (#0064).

const ThemeContext = createContext<Tokens>(TOKENS.light);
export const useTokens = () => useContext(ThemeContext);

export type Caption = { from: number; text: string };

function useFonts() {
  const [handle] = useState(() => delayRender('Loading fonts'));
  useEffect(() => {
    Promise.all([
      document.fonts.load('400 20px "Inter Variable"'),
      document.fonts.load('600 20px "Inter Variable"'),
      document.fonts.load('400 20px "JetBrains Mono Variable"'),
    ]).then(() => continueRender(handle), () => continueRender(handle));
  }, [handle]);
}

export const LoopMark: FC<{ size: number }> = ({ size }) => {
  const t = useTokens();
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="8" fill={t.accent} />
      <path d="M22.5 11.2A8 8 0 1 0 24 16" fill="none" stroke={t['on-accent']} strokeWidth="3" strokeLinecap="round" />
      <path d="M19.4 9.6l3.9 1.5-1.5 3.9" fill="none" stroke={t['on-accent']} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// The frame every scene sits in: brand line on top, captions at the bottom.
export const Stage: FC<{ theme: Theme; chapter: string; captions: Caption[]; children: ReactNode; bare?: boolean }> = ({
  theme,
  chapter,
  captions,
  children,
  bare,
}) => {
  useFonts();
  const t = TOKENS[theme];
  const frame = useCurrentFrame();
  const current = [...captions].reverse().find((c) => frame >= c.from);
  const next = captions.find((c) => c.from > frame);
  const fadeIn = current ? progress(frame, current.from, 12) : 0;
  const fadeOut = next ? progress(frame, next.from - 8, 8) : 0;
  return (
    <ThemeContext.Provider value={t}>
      <AbsoluteFill style={{ background: t.bg, color: t.text, fontFamily: FONTS.sans, WebkitFontSmoothing: 'antialiased' }}>
        <AbsoluteFill
          style={{
            background: `radial-gradient(70% 60% at 85% 0%, color-mix(in oklch, ${t.accent} 7%, transparent), transparent 70%), ${t['bg-subtle']}`,
          }}
        />
        {!bare && (
          <div style={{ position: 'absolute', top: 40, left: 56, display: 'flex', alignItems: 'center', gap: 12, fontSize: 19, color: t['text-3'] }}>
            <LoopMark size={26} />
            <span style={{ fontWeight: 600, color: t.text, letterSpacing: '-0.015em' }}>loopboard</span>
            <span>·</span>
            <span>{chapter}</span>
          </div>
        )}
        <div style={{ position: 'absolute', inset: bare ? 0 : '96px 56px 120px' }}>{children}</div>
        {current && (
          <div
            style={{
              position: 'absolute',
              left: 56,
              right: 56,
              bottom: 44,
              fontSize: 31,
              fontWeight: 500,
              letterSpacing: '-0.015em',
              lineHeight: 1.3,
              opacity: fadeIn * (1 - fadeOut),
              transform: `translateY(${(1 - fadeIn) * 8}px)`,
            }}
          >
            {current.text}
          </div>
        )}
      </AbsoluteFill>
    </ThemeContext.Provider>
  );
};

export const Panel: FC<{ style?: CSSProperties; children: ReactNode; title?: string }> = ({ style, children, title }) => {
  const t = useTokens();
  return (
    <div
      style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: 16,
        boxShadow: `0 1px 2px oklch(0.2 0.01 286 / 0.06), 0 8px 24px oklch(0.2 0.01 286 / 0.06)`,
        overflow: 'hidden',
        ...style,
      }}
    >
      {title && (
        <div style={{ padding: '12px 18px', borderBottom: `1px solid ${t['border-subtle']}`, fontSize: 16, fontWeight: 500, color: t['text-3'], display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'flex', gap: 6 }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ width: 10, height: 10, borderRadius: 99, background: t['bg-active'] }} />
            ))}
          </span>
          <span style={{ marginLeft: 6 }}>{title}</span>
        </div>
      )}
      {children}
    </div>
  );
};

export type Status = 'backlog' | 'todo' | 'in-progress' | 'in-review' | 'done';

const STATUS_TOKEN: Record<Status, keyof Tokens> = {
  backlog: 'st-backlog',
  todo: 'st-todo',
  'in-progress': 'st-progress',
  'in-review': 'st-review',
  done: 'st-done',
};

export const STATUS_LABEL: Record<Status, string> = {
  backlog: 'Backlog',
  todo: 'Todo',
  'in-progress': 'In progress',
  'in-review': 'In review',
  done: 'Done',
};

export const StatusIcon: FC<{ status: Status; size?: number }> = ({ status, size = 18 }) => {
  const t = useTokens();
  const c = t[STATUS_TOKEN[status]];
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" style={{ flex: 'none' }}>
      {status === 'backlog' && <circle cx="7" cy="7" r="6" fill="none" stroke={c} strokeWidth="1.5" strokeDasharray="1.6 1.75" />}
      {(status === 'todo' || status === 'in-progress' || status === 'in-review') && (
        <>
          <circle cx="7" cy="7" r="6" fill="none" stroke={c} strokeWidth="1.5" />
          {status === 'in-progress' && <path d="M7 7V3.5a3.5 3.5 0 0 1 0 7Z" fill={c} />}
          {status === 'in-review' && <path d="M7 7V3.5a3.5 3.5 0 1 1-3.5 3.5Z" fill={c} />}
        </>
      )}
      {status === 'done' && (
        <>
          <circle cx="7" cy="7" r="6.5" fill={c} />
          <path d="M4.4 7.2 6.2 9l3.4-3.6" fill="none" stroke={t['on-accent']} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
};

export const Avatar: FC<{ who: 'agent' | 'human'; size?: number }> = ({ who, size = 24 }) => {
  const t = useTokens();
  const bg = who === 'agent' ? t['blue-soft'] : t['orange-soft'];
  const fg = who === 'agent' ? t['blue-text'] : t['orange-text'];
  return (
    <span style={{ display: 'grid', placeItems: 'center', width: size, height: size, borderRadius: 99, background: bg, color: fg, flex: 'none' }}>
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {who === 'agent' ? (
          <>
            <path d="M12 8V4H8" />
            <rect width="16" height="12" x="4" y="8" rx="2" />
            <path d="M2 14h2M20 14h2M15 13v2M9 13v2" />
          </>
        ) : (
          <>
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </>
        )}
      </svg>
    </span>
  );
};

// An issue card like the board's.
export const IssueCard: FC<{ id: string; title: string; status: Status; who?: 'agent' | 'human'; style?: CSSProperties; highlight?: boolean }> = ({
  id,
  title,
  status,
  who = 'agent',
  style,
  highlight,
}) => {
  const t = useTokens();
  return (
    <div
      style={{
        width: 300,
        padding: '14px 16px',
        background: t.surface,
        border: `1px solid ${highlight ? t.accent : t.border}`,
        borderRadius: 12,
        boxShadow: '0 1px 2px oklch(0.2 0.01 286 / 0.06)',
        display: 'grid',
        gap: 10,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: FONTS.mono, fontSize: 14, color: t['text-3'] }}>
        <StatusIcon status={status} size={16} />
        #{id}
        <span style={{ marginLeft: 'auto' }}>
          <Avatar who={who} size={22} />
        </span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 500, lineHeight: 1.35, color: t.text }}>{title}</div>
    </div>
  );
};

export const FileChip: FC<{ path: string; style?: CSSProperties; tone?: 'accent' | 'plain'; icon?: 'file' | 'folder' }> = ({
  path,
  style,
  tone = 'plain',
  icon = 'file',
}) => {
  const t = useTokens();
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 14px',
        borderRadius: 10,
        background: tone === 'accent' ? t['accent-soft'] : t.surface,
        border: `1px solid ${tone === 'accent' ? 'transparent' : t.border}`,
        fontFamily: FONTS.mono,
        fontSize: 17,
        color: tone === 'accent' ? t['accent-text'] : t.text,
        ...style,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.75 }}>
        {icon === 'folder' ? (
          <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
        ) : (
          <>
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          </>
        )}
      </svg>
      {path}
    </div>
  );
};

export const Bubble: FC<{ who: 'agent' | 'human'; children: ReactNode; style?: CSSProperties }> = ({ who, children, style }) => {
  const t = useTokens();
  const mine = who === 'human';
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: mine ? 'row-reverse' : 'row', ...style }}>
      <Avatar who={who} size={30} />
      <div
        style={{
          maxWidth: 470,
          padding: '12px 16px',
          borderRadius: 14,
          background: mine ? t.accent : t.surface,
          color: mine ? t['on-accent'] : t.text,
          border: mine ? 'none' : `1px solid ${t.border}`,
          fontSize: 19,
          lineHeight: 1.4,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export const Check: FC<{ size?: number; color?: string }> = ({ size = 18, color }) => {
  const t = useTokens();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? t['green-text']} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
};
