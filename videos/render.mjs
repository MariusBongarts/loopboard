// Renders the Help Center's explainer videos (#0064) — every composition in
// light and dark, plus a poster still each, into ../public/media/.
//   node render.mjs            all course videos
//   node render.mjs loop       just one
//   node render.mjs --film     the overview film (landscape + square) into out/
//   node render.mjs --stills loop 60,200   preview frames into out/stills/
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FILM, FPS, LEARN_VIDEOS, THEMES } from './src/catalog.ts';

const here = dirname(fileURLToPath(import.meta.url));
const media = resolve(here, '../public/media');
const out = resolve(here, 'out');
const args = process.argv.slice(2);
const only = args.find((a) => !a.startsWith('--') && !/^\d/.test(a));

// Reuse Playwright's headless shell when it's installed (the repo's e2e
// tests need it anyway); otherwise Remotion fetches its own.
function playwrightShell() {
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || join(homedir(), process.platform === 'darwin' ? 'Library/Caches/ms-playwright' : '.cache/ms-playwright');
  if (!existsSync(cache)) return undefined;
  const dirs = readdirSync(cache).filter((d) => d.startsWith('chromium_headless_shell-')).sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));
  for (const d of dirs) {
    for (const sub of readdirSync(join(cache, d))) {
      const bin = join(cache, d, sub, 'chrome-headless-shell');
      if (existsSync(bin)) return bin;
    }
  }
  return undefined;
}

const browserExecutable = process.env.REMOTION_BROWSER || playwrightShell() || null;
const kb = (file) => `${Math.round(statSync(file).size / 1024)} KB`;

console.log('Bundling…');
const serveUrl = await bundle({ entryPoint: resolve(here, 'src/index.ts') });

async function render(id, theme, output, poster) {
  const inputProps = { theme };
  const composition = await selectComposition({ serveUrl, id, inputProps, browserExecutable });
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    crf: 27,
    x264Preset: 'slow',
    outputLocation: output,
    inputProps,
    browserExecutable,
  });
  console.log(`  ${output} (${kb(output)})`);
  if (poster) {
    await renderStill({ composition, serveUrl, output: poster.file, frame: poster.frame, imageFormat: 'jpeg', jpegQuality: 82, inputProps, browserExecutable });
    console.log(`  ${poster.file} (${kb(poster.file)})`);
  }
}

if (args.includes('--stills')) {
  const frames = (args.find((a) => /^\d+(,\d+)*$/.test(a)) ?? '0').split(',').map(Number);
  const dir = join(out, 'stills');
  mkdirSync(dir, { recursive: true });
  for (const v of LEARN_VIDEOS.filter((v) => !only || v.name === only)) {
    for (const theme of THEMES) {
      const composition = await selectComposition({ serveUrl, id: `learn-${v.name}`, inputProps: { theme }, browserExecutable });
      for (const frame of frames.filter((f) => f < composition.durationInFrames)) {
        const file = join(dir, `${v.name}-${String(frame).padStart(3, '0')}-${theme}.jpg`);
        await renderStill({ composition, serveUrl, output: file, frame, imageFormat: 'jpeg', jpegQuality: 70, inputProps: { theme }, browserExecutable });
      }
    }
  }
  console.log(`  stills in ${dir}`);
} else if (args.includes('--film')) {
  mkdirSync(out, { recursive: true });
  for (const f of FILM.formats) {
    await render(`${FILM.id}-${f.suffix}`, 'dark', join(out, `loopboard-${f.suffix}.mp4`));
  }
} else {
  mkdirSync(media, { recursive: true });
  for (const v of LEARN_VIDEOS.filter((v) => !only || v.name === only)) {
    for (const theme of THEMES) {
      const base = join(media, `learn-${v.name}-${theme}`);
      await render(`learn-${v.name}`, theme, `${base}.mp4`, { file: `${base}.jpg`, frame: v.poster * FPS });
    }
  }
}
