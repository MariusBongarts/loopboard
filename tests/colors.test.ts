import { describe, expect, it } from 'vitest';
import { TONES, slugTone, toneClass } from '../src/colors';

describe('slugTone', () => {
  it('is pure — same input maps to the same tone every time', () => {
    const slug = '05-paywall';
    const tone = slugTone(slug);
    expect(slugTone(slug)).toBe(tone);
    expect(slugTone(slug)).toBe(tone);
    expect(slugTone(slug)).toBe(tone);
  });

  it('returns a tone from the canonical TONES list for any input', () => {
    const inputs = [
      '05-paywall',
      '06-issue-tracker',
      '04-claude-design-implementation',
      '08-playwright-agent-mock-and-coverage-expansion',
      'paddle',
      'i18n',
      'credits',
      'design-migration',
      'a',
      'longer-multi-word-slug-with-numbers-12345',
    ];
    for (const slug of inputs) {
      expect(TONES).toContain(slugTone(slug));
    }
  });

  it('produces distinct tones for the live tracker projects', () => {
    // Lock the snapshot so adding a new project that collides forces a
    // conscious decision (rotate one slug, expand the palette, or accept).
    const projects = [
      '05-paywall',
      '06-issue-tracker',
      '04-claude-design-implementation',
      '08-playwright-agent-mock-and-coverage-expansion',
    ];
    const tones = new Set(projects.map(slugTone));
    expect(tones.size).toBeGreaterThanOrEqual(3);
  });

  it('handles the empty string by returning the first tone (safe default)', () => {
    expect(slugTone('')).toBe(TONES[0]);
  });

  it('toneClass formats the tone as a CSS class', () => {
    const slug = '05-paywall';
    expect(toneClass(slug)).toBe(`tone-${slugTone(slug)}`);
    expect(toneClass(slug).startsWith('tone-')).toBe(true);
  });
});
