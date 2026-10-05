import { describe, expect, it } from 'vitest';
import { toggleTask } from '../src/tasks';

const md = '- [ ] one\n\n```md\n- [ ] not a task, code\n```\n\n1. [x] two\n   - [ ] three\n';

describe('toggleTask', () => {
  it('flips the nth task, skipping fenced code', () => {
    expect(toggleTask(md, 0)).toBe(md.replace('- [ ] one', '- [x] one'));
    expect(toggleTask(md, 1)).toBe(md.replace('1. [x] two', '1. [ ] two'));
    expect(toggleTask(md, 2)).toBe(md.replace('   - [ ] three', '   - [x] three'));
  });

  it('returns null when there is no such task', () => {
    expect(toggleTask(md, 3)).toBeNull();
  });
});
