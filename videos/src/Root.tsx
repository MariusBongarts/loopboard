import type { FC } from 'react';
import { Composition } from 'remotion';
import { FILM, FPS, LEARN_VIDEOS } from './catalog';
import { Film, filmDuration } from './Film';
import { SCENES } from './scenes';

export const Root: FC = () => (
  <>
    {LEARN_VIDEOS.map((v) => (
      <Composition
        key={v.name}
        id={`learn-${v.name}`}
        component={SCENES[v.name]}
        durationInFrames={v.seconds * FPS}
        fps={FPS}
        width={1280}
        height={720}
        defaultProps={{ theme: 'light' }}
      />
    ))}
    {FILM.formats.map((f) => (
      <Composition
        key={f.suffix}
        id={`${FILM.id}-${f.suffix}`}
        component={Film}
        durationInFrames={filmDuration}
        fps={FPS}
        width={f.width}
        height={f.height}
        defaultProps={{ theme: 'dark' }}
      />
    ))}
  </>
);
