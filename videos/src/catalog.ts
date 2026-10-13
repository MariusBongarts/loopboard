// Every composition the Help Center ships (#0064, #0065). Pure data so the
// render script and the app's tests can read it without React.
export const FPS = 30;

export const LEARN_VIDEOS = [
  { name: 'memory', seconds: 20, poster: 19 },
  { name: 'skills', seconds: 18, poster: 13 },
  { name: 'grill', seconds: 18, poster: 17 },
  { name: 'slices', seconds: 20, poster: 19 },
  { name: 'loop', seconds: 22, poster: 9 },
  { name: 'board', seconds: 18, poster: 11 },
] as const;

export type LearnVideo = (typeof LEARN_VIDEOS)[number]['name'];

export const THEMES = ['light', 'dark'] as const;

export const FILM = {
  id: 'film',
  formats: [
    { suffix: 'landscape', width: 1920, height: 1080 },
    { suffix: 'square', width: 1080, height: 1080 },
  ],
} as const;
