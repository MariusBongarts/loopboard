import { describe, expect, it } from 'vitest';
import { clampSize } from '../src/resize';

describe('clampSize', () => {
  it('keeps a pane inside its bounds and rounds to whole pixels', () => {
    expect(clampSize(120.4, 180, 460)).toBe(180);
    expect(clampSize(999, 180, 460)).toBe(460);
    expect(clampSize(301.6, 180, 460)).toBe(302);
  });
});
