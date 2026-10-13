import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TOKENS } from '../videos/src/tokens';

// The explainer videos copy the app's tokens (#0064); this keeps them equal.
function block(css: string, selector: string): Record<string, string> {
  const start = css.indexOf('{', css.indexOf(selector));
  const body = css.slice(start, css.indexOf('}', start));
  return Object.fromEntries([...body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

describe('video tokens', () => {
  const css = readFileSync('src/styles.css', 'utf8');
  it.each([
    ['light', ':root {'],
    ['dark', ':root[data-theme="dark"]'],
  ] as const)('match styles.css in %s', (theme, selector) => {
    const app = block(css, selector);
    for (const [name, value] of Object.entries(TOKENS[theme])) expect([name, value]).toEqual([name, app[name]]);
  });
});
