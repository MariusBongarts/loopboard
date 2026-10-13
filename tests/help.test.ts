import { existsSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHAPTERS, LOOP_STEPS, SOURCE_VIDEOS, VIDEOS, videoSources } from '../src/course';
import { HELP_SECTIONS, SETUP_PROMPT, UPGRADE_PATH_PLACEHOLDER, UPGRADE_REQUEST, helpLink, upgradePrompt } from '../src/help';
import { LEARN_VIDEOS, THEMES } from '../videos/src/catalog';

describe('Help Center content (#0060, #0061)', () => {
  const readme = readFileSync('README.md', 'utf8');

  it('quotes the setup and upgrade prompts in the README verbatim', () => {
    expect(readme).toContain(SETUP_PROMPT);
    expect(readme).toContain(upgradePrompt());
    expect(readme).toContain(UPGRADE_REQUEST);
  });

  it('fills the running package path into the upgrade prompt', () => {
    const prompt = upgradePrompt('/opt/loopboard');
    expect(prompt).not.toContain(UPGRADE_PATH_PLACEHOLDER);
    expect(prompt).toContain('/opt/loopboard/.agents/skills/upgrade-harness/SKILL.md');
  });

  it('keeps ?from on every Help link', () => {
    expect(helpLink('/help/learn', 'tracker', 'skills')).toEqual({ path: '/help/learn', query: { from: 'tracker' }, hash: '#skills' });
    expect(helpLink('/help', undefined)).toEqual({ path: '/help', query: {}, hash: '' });
  });
});

describe('course (#0063, #0065, #0066)', () => {
  it('reads every chapter from docs/learn with a title and body', () => {
    expect(CHAPTERS.map((c) => c.number)).toEqual(CHAPTERS.map((_, i) => i + 1));
    for (const c of CHAPTERS) {
      expect(c.title).not.toBe(c.id);
      expect(c.markdown.trim().length).toBeGreaterThan(200);
    }
    expect(HELP_SECTIONS.learn?.map((s) => s.id)).toEqual([...CHAPTERS.map((c) => c.id), 'sources']);
  });

  it('links every loop step to a chapter', () => {
    const ids = new Set(CHAPTERS.map((c) => c.id));
    for (const step of LOOP_STEPS) expect(ids.has(step.chapter)).toBe(true);
  });

  it('ships every video the course uses, in both themes, with a poster', () => {
    expect([...VIDEOS].sort()).toEqual(LEARN_VIDEOS.map((v) => v.name).sort());
    let bytes = 0;
    for (const name of VIDEOS) {
      for (const theme of THEMES) {
        const { src, poster } = videoSources(name, theme);
        for (const file of [src, poster]) {
          const path = `public${file}`;
          expect(existsSync(path), path).toBe(true);
          bytes += statSync(path).size;
        }
      }
    }
    expect(bytes).toBeLessThan(6 * 1024 * 1024);
    for (const c of CHAPTERS.filter((c) => c.video)) expect(c.videoLabel).toBeTruthy();
  });

  it('lists Matt Pocock’s videos by their 11-character YouTube ids', () => {
    for (const v of SOURCE_VIDEOS) expect(v.id).toMatch(/^[\w-]{11}$/);
  });
});
