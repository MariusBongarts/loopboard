import { describe, expect, it } from 'vitest';
import { issueRefs, issueRefSource } from '../shared/refs';

// What counts as a local `#NNNN` reference, for every matcher (#0100).
describe('issueRefs', () => {
  const ids = (text: string) => issueRefs(text).map((r) => r.id);

  it.each([
    ['#0003', ['0003']],
    ['(#0003)', ['0003']],
    ['Start #0003.', ['0003']],
    ['#0003, then #0004\n#0005', ['0003', '0004', '0005']],
    ['[#0003 First](../../issues/0003-first.md)', ['0003']],
  ] as const)('reads %j', (text, expected) => {
    expect(ids(text)).toEqual(expected);
  });

  it.each([
    'shop#0003',
    'see shop#0003.',
    'v2#0003',
    '##0003',
    'https://example.com/#0003',
    '&#8212;',
    '#00031',
    '#003',
  ])('leaves %j alone', (text) => {
    expect(ids(text)).toEqual([]);
  });

  it('says where each # is', () => {
    expect(issueRefs('a #0001\n(#0002)')).toEqual([
      { id: '0001', index: 2 },
      { id: '0002', index: 9 },
    ]);
  });
});

describe('issueRefSource', () => {
  it('narrows to one number and keeps the character before the #', () => {
    const re = new RegExp(issueRefSource('0001'), 'g');
    expect('#0001, (#0001), shop#0001, #0002'.replace(re, '$1#0005')).toBe('#0005, (#0005), shop#0001, #0002');
  });
});
