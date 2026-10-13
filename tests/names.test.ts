import { describe, expect, it } from 'vitest';
import { matchName } from '../server/names';

// The reader, the workspace counter and the ID allocator share this (#0071).
describe('matchName', () => {
  it('accepts NNNN-slug.md and NN-slug', () => {
    expect(matchName('issue', '0042-fix-the-export.md')).toEqual({ valid: true, id: '0042' });
    expect(matchName('project', '03-offline-mode')).toEqual({ valid: true, id: '03' });
  });

  it('flags near misses and keeps the number they claim', () => {
    for (const name of ['0002-Tax-Return.md', '0002_tax_return.md', '0002-tax-return 2.md', '0002-tax-return.MD', '0002.md']) {
      expect(matchName('issue', name), name).toEqual({ valid: false, id: '0002' });
    }
    // A dotted folder keeps its number; whoever lists projects/ leaves files out.
    for (const name of ['03-Offline-Mode', '03_offline_mode', '03 offline mode', '03-offline-v1.2', '03-notes.txt']) {
      expect(matchName('project', name), name).toEqual({ valid: false, id: '03' });
    }
  });

  it('flags a name with a line break in it', () => {
    for (const name of ['0002-tax\nreturn.md', '0002-tax\rreturn.md', '0002-tax\u2028return.md']) {
      expect(matchName('issue', name), JSON.stringify(name)).toEqual({ valid: false, id: '0002' });
    }
    expect(matchName('project', '03-offline\nmode')).toEqual({ valid: false, id: '03' });
  });

  it('flags a near miss without a number of the right width', () => {
    for (const name of ['2-tax-return.md', '00021-tax-return.md']) {
      expect(matchName('issue', name), name).toEqual({ valid: false, id: null });
    }
    for (const name of ['offline-mode', '3-offline-mode', '003-offline-mode']) {
      expect(matchName('project', name), name).toEqual({ valid: false, id: null });
    }
  });

  it('ignores what is neither', () => {
    for (const name of ['README.md', '_templates', '_archive', '.DS_Store', '0002-tax-return.md.bak', 'notes.txt']) {
      expect(matchName('issue', name), name).toBeNull();
    }
    for (const name of ['README.md', '01-notes.md', '_templates', '.DS_Store']) {
      expect(matchName('project', name), name).toBeNull();
    }
  });
});
