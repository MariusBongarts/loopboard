import { describe, expect, it } from 'vitest';
import { issuePathRefs, issueRefs, localIssuePath, replaceIssueRefs } from '../shared/refs';

// What counts as a local `#NNNN` reference, for every matcher (#0100).
describe('issueRefs', () => {
  const ids = (text: string) => issueRefs(text).map((r) => r.id);

  it.each([
    ['#0003', ['0003']],
    ['(#0003)', ['0003']],
    ['Start #0003.', ['0003']],
    ['#0003, then #0004\n#0005', ['0003', '0004', '0005']],
    ['[#0003 First](../../issues/0003-first.md)', ['0003']],
    // A slash right after a reference lists the next one.
    ['#0003/#0004: docs', ['0003', '0004']],
    ['(#0003/#0004/#0005)', ['0003', '0004', '0005']],
    // Emphasis around a reference doesn't hide it.
    ['**#0003** and _#0004 soon_ and *#0005*', ['0003', '0004', '0005']],
  ] as const)('reads %j', (text, expected) => {
    expect(ids(text)).toEqual(expected);
  });

  it.each([
    'shop#0003',
    'see shop#0003.',
    'v2#0003',
    '##0003',
    'https://example.com/#0003',
    'https://example.com/2026/#0003',
    'docs/#0003/#0004',
    '&#8212;',
    '#00031',
    '#003',
    // A letter of any script names another harness.
    'café#0003',
    'büro#0003',
    '店#0003',
    // Emphasis and code marks don't part the name from its number.
    '**shop**#0003',
    '__shop__#0003',
    '`shop`#0003',
  ])('leaves %j alone', (text) => {
    expect(ids(text)).toEqual([]);
  });

  it('says where each # is', () => {
    expect(issueRefs('a #0001\n(#0002)')).toEqual([
      { id: '0001', index: 2 },
      { id: '0002', index: 9 },
    ]);
  });

  it('takes the text in front of a fragment into account', () => {
    expect(issueRefs('#0003 and #0004', 'shop')).toEqual([{ id: '0004', index: 10 }]);
    expect(issueRefs('#0003', 'see ')).toEqual([{ id: '0003', index: 0 }]);
    expect(issueRefs('/#0004', '#0003')).toEqual([{ id: '0004', index: 1 }]);
  });
});

describe('replaceIssueRefs', () => {
  it('rewrites one number and leaves qualified ones and other numbers alone', () => {
    expect(replaceIssueRefs('#0001, (#0001), shop#0001, #0002', '0001', '0005')).toBe('#0005, (#0005), shop#0001, #0002');
    expect(replaceIssueRefs('#0002/#0001: both', '0001', '0005')).toBe('#0002/#0005: both');
  });
});

// A WIP links its issues as files; a path through another folder is another
// harness's issue with the same number (#0100).
describe('issue-file paths', () => {
  it.each([
    ['../../issues/0003-pay.md', '0003'],
    ['../../issues/_archive/0003-pay.md', '0003'],
    ['../issues/0003-pay.md', '0003'],
    ['issues/0003-pay.md', '0003'],
    ['.agents/issues/0003-pay.md', '0003'],
    ['/ai/issues/0003-pay.md', '0003'],
  ])('%s is local', (path, id) => {
    expect(localIssuePath(path)).toBe(id);
  });

  it.each([
    '../../../shop/.agents/issues/0003-pay.md',
    '../shop/issues/0003-pay.md',
    'https://example.com/shop/blob/main/.agents/issues/0003-pay.md',
    '../../issues/README.md',
    './prd.md',
  ])('%s is not', (path) => {
    expect(localIssuePath(path)).toBeNull();
  });

  it('finds the local ones in a text, by position', () => {
    const text = '- [ ] [A](../../issues/0001-a.md), [shop#0003](../../../shop/.agents/issues/0003-pay.md) and issues/_archive/0002-b.md';
    expect(issuePathRefs(text).map((r) => r.id)).toEqual(['0001', '0002']);
    expect(text.slice(issuePathRefs(text)[0].index)).toMatch(/^\.\.\/\.\.\/issues\/0001-a\.md/);
  });
});
