import { describe, expect, it } from 'vitest';
import { escapeControls, printable, quoted } from '../shared/printable';

// Names from disk stay one line of data, in a terminal and in a prompt (#0071).
describe('printable', () => {
  it('leaves harmless names as they are, also with spaces, quotes and umlauts', () => {
    for (const name of ['issues/0001-first.md', 'issues/0001-first 2.md', "01_Beta's copy", 'projects/02-Größe', 'a "b" `c`']) {
      expect(printable(name), name).toBe(name);
    }
  });

  it('quotes a name with control characters, line separators or bidi overrides', () => {
    expect(printable('a\nb')).toBe('"a\\nb"');
    expect(printable('a\x1b[2Kb')).toBe('"a\\u001b[2Kb"');
    expect(printable('a\x7f\x9bb')).toBe('"a\\u007f\\u009bb"');
    expect(printable('a\u2028b\u2029c')).toBe('"a\\u2028b\\u2029c"');
    expect(printable('a\u202eb\u2066c\u200fd')).toBe('"a\\u202eb\\u2066c\\u200fd"');
  });

  it('quoted escapes quotes and backslashes as well', () => {
    expect(quoted('say "hi" \\ bye')).toBe('"say \\"hi\\" \\\\ bye"');
    expect(JSON.parse(quoted('a\nb \u2028 "c"'))).toBe('a\nb \u2028 "c"');
  });

  it('escapeControls keeps everything else', () => {
    expect(escapeControls('bad indentation\r\nof a mapping entry')).toBe('bad indentation\\u000d\\u000aof a mapping entry');
  });
});
