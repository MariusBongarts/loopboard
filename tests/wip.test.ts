import { describe, expect, it } from 'vitest';
import { normalizeCreated } from '../server/issues';
import {
  firstParagraph,
  parseProjectDigest,
  parseSessions,
  sectionBody,
  toPlainText,
} from '../server/wip';

const WIP = `# Android App Release — WIP

> Last updated: 2026-09-07
> PRD: [./prd.md](./prd.md)
> Status: in-progress

## Current focus

**Phase 0 + Phase 1 in parallel.** Start the keystore
([#0482](../../issues/0482-release-upload-keystore.md)) and
[Firebase Pass 1](../../issues/_archive/0454-mobile-credentials.md).

Read the human tickets top to bottom.

## Phases

### Phase 0 — Accounts

- [ ] [#0482 Keystore](../../issues/0482-release-upload-keystore.md) — todo

## Activity log

### 2026-09-15

- Premium panel rebuilt — [#0816](../../issues/0816-premium.md).
- Second bullet is not the headline.

### 2026-09-21 — go-live run

- Release 12 on internal testing.

### 2026-09-15 (later)

- A second entry on the same day is ignored.
`;

const PRD = `# Android — PRD

## Problem statement

The Android app exists, but nobody can install it.

More detail that is not the first paragraph.

## Solution

A \`Play\` listing and a **signed** track.
`;

describe('sectionBody', () => {
  it('returns the text under an H2 up to the next H2', () => {
    expect(sectionBody(WIP, 'Phases')).toContain('Phase 0 — Accounts');
    expect(sectionBody(WIP, 'Phases')).not.toContain('Activity log');
  });

  it('is case-insensitive and empty when missing', () => {
    expect(sectionBody(WIP, 'current FOCUS')).toContain('Phase 0 + Phase 1');
    expect(sectionBody(WIP, 'Ship summary')).toBe('');
  });
});

describe('firstParagraph', () => {
  it('skips headings and blank lines', () => {
    expect(firstParagraph('\n### Heading\n\nFirst para\nwraps.\n\nSecond.')).toBe('First para\nwraps.');
  });
});

describe('toPlainText', () => {
  it('collapses id-only issue links to #NNNN and keeps other link text', () => {
    const out = toPlainText(
      'the keystore ([#0482](../../issues/0482-x.md)) and [Firebase Pass 1](../../issues/_archive/0454-y.md) and [docs](https://x.dev)',
    );
    expect(out).toBe('the keystore (#0482) and Firebase Pass 1 (#0454) and docs');
  });

  // #0100: the same number in another harness is not this root's issue.
  it("keeps the text of a link to another harness's issue file and adds no local number", () => {
    expect(toPlainText('Waiting on [shop#0003](../../../shop/.agents/issues/0003-pay.md) and [the fix](../../../shop/.agents/issues/0004-fix.md).')).toBe(
      'Waiting on shop#0003 and the fix.',
    );
  });

  it('strips emphasis and code marks and normalizes whitespace', () => {
    expect(toPlainText('**bold**  `code`\n  __u__')).toBe('bold code u');
  });
});

describe('parseSessions', () => {
  it('keeps the first bullet per date, newest first, first entry per day wins', () => {
    const sessions = parseSessions(sectionBody(WIP, 'Activity log'));
    expect(sessions).toEqual([
      { date: '2026-09-21', note: 'Release 12 on internal testing.' },
      { date: '2026-09-15', note: 'Premium panel rebuilt — #0816.' },
    ]);
  });
});

describe('parseProjectDigest', () => {
  it('reads focus, PRD problem and solution, and the last session', () => {
    const d = parseProjectDigest(WIP, PRD);
    expect(d.focus).toBe(
      'Phase 0 + Phase 1 in parallel. Start the keystore (#0482) and Firebase Pass 1 (#0454).',
    );
    expect(d.problem).toBe('The Android app exists, but nobody can install it.');
    expect(d.solution).toBe('A Play listing and a signed track.');
    expect(d.lastSession).toBe('2026-09-21');
    expect(d.sessions).toHaveLength(2);
  });

  it('falls back to "Last updated" when the log has no dated entries', () => {
    const d = parseProjectDigest('> Last updated: 2026-05-01\n\n## Current focus\n\nNothing yet.\n', '');
    expect(d.lastSession).toBe('2026-05-01');
    expect(d.focus).toBe('Nothing yet.');
    expect(d.problem).toBe('');
  });
});

describe('normalizeCreated', () => {
  it('turns a YAML Date into an ISO day and passes strings through', () => {
    expect(normalizeCreated(new Date('2026-09-16T00:00:00Z'))).toBe('2026-09-16');
    expect(normalizeCreated('2026-09-16')).toBe('2026-09-16');
    expect(normalizeCreated(undefined)).toBeUndefined();
  });
});
