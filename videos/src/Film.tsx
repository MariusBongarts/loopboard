import type { FC, ReactNode } from 'react';
import { AbsoluteFill, Series, useCurrentFrame, useVideoConfig } from 'remotion';
import { FPS, LEARN_VIDEOS } from './catalog';
import { appear, progress } from './motion';
import { SCENES } from './scenes';
import { FONTS, TOKENS, type Theme } from './tokens';
import { LoopMark, Stage, useTokens } from './ui';

// The overview film for posts (#0068): intro, the six scenes, credits.
// Scenes are drawn at 1280×720 and scaled into landscape or square.
const INTRO = 105;
const OUTRO = 165;

export const filmDuration = INTRO + OUTRO + LEARN_VIDEOS.reduce((n, v) => n + v.seconds * FPS, 0);

const Fit: FC<{ children: ReactNode; theme: Theme; bands?: boolean }> = ({ children, theme, bands = true }) => {
  const { width, height } = useVideoConfig();
  const t = TOKENS[theme];
  const scale = Math.min(width / 1280, height / 720);
  const square = bands && height / width > 0.8;
  return (
    <AbsoluteFill style={{ background: t['bg-subtle'], fontFamily: FONTS.sans }}>
      <div style={{ position: 'absolute', width: 1280, height: 720, left: (width - 1280 * scale) / 2, top: (height - 720 * scale) / 2, transform: `scale(${scale})`, transformOrigin: 'top left', overflow: 'hidden' }}>
        {children}
      </div>
      {square && (
        <>
          <div style={{ position: 'absolute', top: 70, left: 0, right: 0, textAlign: 'center', fontSize: 40, fontWeight: 600, letterSpacing: '-0.02em', color: t.text }}>
            How I work with AI agents
          </div>
          <div style={{ position: 'absolute', bottom: 70, left: 0, right: 0, textAlign: 'center', fontSize: 26, color: t['text-3'] }}>
            loopboard · skills adapted from Matt Pocock
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};

const Card: FC<{ theme: Theme; children: ReactNode }> = ({ theme, children }) => (
  <Stage theme={theme} chapter="" captions={[]} bare>
    <AbsoluteFill style={{ display: 'grid', placeContent: 'center', justifyItems: 'center', gap: 22, textAlign: 'center' }}>{children}</AbsoluteFill>
  </Stage>
);

const Intro: FC = () => {
  const t = useTokens();
  const frame = useCurrentFrame();
  return (
    <>
      <div style={appear(frame, 0)}>
        <LoopMark size={72} />
      </div>
      <div style={{ fontSize: 60, fontWeight: 600, letterSpacing: '-0.025em', ...appear(frame, 8) }}>How I work with AI agents</div>
      <div style={{ fontSize: 28, color: t['text-2'], ...appear(frame, 18) }}>Skills, PRDs, issues and the loop — on a board</div>
    </>
  );
};

const Outro: FC = () => {
  const t = useTokens();
  const frame = useCurrentFrame();
  const fade = progress(frame, OUTRO - 16, 16);
  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 22, opacity: 1 - fade }}>
      <div style={{ fontSize: 46, fontWeight: 600, letterSpacing: '-0.02em', ...appear(frame, 0) }}>You decide and steer. The agent builds.</div>
      <div style={{ fontSize: 26, lineHeight: 1.5, color: t['text-2'], maxWidth: 900, ...appear(frame, 14) }}>
        Skills adapted from <span style={{ color: t['accent-text'] }}>github.com/mattpocock/skills</span> — thank you, Matt Pocock.
      </div>
      <div style={{ marginTop: 10, padding: '14px 22px', borderRadius: 14, background: t.surface, border: `1px solid ${t.border}`, fontFamily: FONTS.mono, fontSize: 28, ...appear(frame, 30) }}>
        npx loopboard
      </div>
      <div style={{ fontSize: 22, color: t['text-3'], ...appear(frame, 40) }}>github.com/MariusBongarts/loopboard</div>
    </div>
  );
};

export const Film: FC<{ theme: Theme }> = ({ theme }) => (
  <Series>
    <Series.Sequence durationInFrames={INTRO}>
      <Fit theme={theme} bands={false}>
        <Card theme={theme}>
          <Intro />
        </Card>
      </Fit>
    </Series.Sequence>
    {LEARN_VIDEOS.map((v) => {
      const Scene = SCENES[v.name];
      return (
        <Series.Sequence key={v.name} durationInFrames={v.seconds * FPS}>
          <Fit theme={theme}>
            <Scene theme={theme} />
          </Fit>
        </Series.Sequence>
      );
    })}
    <Series.Sequence durationInFrames={OUTRO}>
      <Fit theme={theme} bands={false}>
        <Card theme={theme}>
          <Outro />
        </Card>
      </Fit>
    </Series.Sequence>
  </Series>
);
