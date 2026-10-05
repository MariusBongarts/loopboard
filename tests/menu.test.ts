import { describe, expect, it } from 'vitest';
import { filterEntries, type MenuEntry } from '../src/menu';

const entries: MenuEntry[] = [
  { id: 'a', label: 'In progress' },
  'separator',
  { id: 'b', label: 'Wire the export button', hint: '#0001' },
  { id: 'c', label: 'Cache the feed', hint: '#0002' },
];

describe('filterEntries', () => {
  it('returns everything for an empty query', () => {
    expect(filterEntries(entries, '  ')).toBe(entries);
  });

  it('matches every word against label and hint, dropping separators', () => {
    expect(filterEntries(entries, 'feed').map((e) => e !== 'separator' && e.id)).toEqual(['c']);
    expect(filterEntries(entries, '0001 export').map((e) => e !== 'separator' && e.id)).toEqual(['b']);
    expect(filterEntries(entries, 'nothing')).toEqual([]);
  });
});
