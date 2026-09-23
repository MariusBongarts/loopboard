import { describe, expect, it } from 'vitest';
import {
  aggregateCoverage,
  emptyCoverageCounts,
  parseSpec,
  specCoverage,
  type Spec,
} from '../server/specs';

const FULL_TABLE_FIXTURE = `# 9. Module Configuration

## E2E coverage

Tests in [\`09-module.spec.ts\`](../../tests/e2e/09-module.spec.ts).

| Scenario | Status | Notes |
|---|---|---|
| User opens module config | ✅ | smoke covered |
| User saves module changes | 🟡 | save asserted, validation deferred |
| User cancels mid-edit | ⏳ | \`test.fixme\` — pending issue #999 |
| User deletes a module | ❌ | not yet |

## Behaviour notes

Some preamble before scenarios.

### Scenario: User opens module config

\`\`\`
GIVEN I am on /templates/:id
WHEN I click the gear icon
THEN the config drawer opens
\`\`\`

### Scenario: User saves module changes

\`\`\`
GIVEN the drawer is open
WHEN I edit a field and click Save
THEN the module is updated
\`\`\`

### Scenario: User cancels mid-edit

\`\`\`
GIVEN I am editing
WHEN I press Esc
THEN changes are discarded
\`\`\`

### Scenario: User deletes a module

\`\`\`
GIVEN the drawer is open
WHEN I click Delete
THEN the module is removed
\`\`\`
`;

const NO_TABLE_FIXTURE = `# 13. Reader / Newsfeed

### Scenario: User opens the reader

\`\`\`
GIVEN I am signed in
WHEN I navigate to /reader
THEN I see editions
\`\`\`

### Scenario: User flips between editions

\`\`\`
GIVEN I am viewing
WHEN I press right arrow
THEN I jump to the next edition
\`\`\`
`;

const ORPHAN_ROW_FIXTURE = `# 5. Header

## E2E coverage

| Scenario | Status | Notes |
|---|---|---|
| Visitor sees the masthead | ✅ | covered |
| Stale row that no longer matches an H3 | ✅ | drift |

### Scenario: Visitor sees the masthead

\`\`\`
GIVEN I am anywhere
WHEN the page renders
THEN the masthead is visible
\`\`\`
`;

const PREAMBLE_FIXTURE = `# 7. Dashboard

This file has a long intro paragraph that should
end up in the preamble after we strip the coverage
block out.

## Behaviour notes

A separate H2 with body content.

## E2E coverage

| Scenario | Status | Notes |
|---|---|---|
| Visitor opens dashboard | ✅ | covered |

### Scenario: Visitor opens dashboard

\`\`\`
GIVEN I am signed in
WHEN I navigate to /dashboard
THEN I see my templates
\`\`\`
`;

describe('parseSpec — full coverage table', () => {
  const spec = parseSpec('09', '09-module-configuration.md', FULL_TABLE_FIXTURE);

  it('extracts the H1 title', () => {
    expect(spec.title).toBe('9. Module Configuration');
  });

  it('flags hasTable=true', () => {
    expect(spec.hasTable).toBe(true);
  });

  it('parses four scenarios with the right statuses from the table', () => {
    expect(spec.scenarios.map((s) => s.status)).toEqual([
      'covered',
      'partial',
      'fixme',
      'none',
    ]);
  });

  it('captures notes from the third column', () => {
    expect(spec.scenarios[1].notes).toBe('save asserted, validation deferred');
  });

  it('strips the "Scenario: " prefix from titles', () => {
    expect(spec.scenarios[0].title).toBe('User opens module config');
  });

  it('captures the body of each scenario', () => {
    expect(spec.scenarios[0].body).toContain('GIVEN I am on /templates/:id');
    expect(spec.scenarios[0].body).toContain('THEN the config drawer opens');
  });

  it('preamble does NOT include the coverage block', () => {
    expect(spec.preamble).not.toMatch(/## E2E coverage/);
    expect(spec.preamble).not.toMatch(/User saves module changes/);
  });

  it('preamble preserves the H1 and "Behaviour notes" H2', () => {
    expect(spec.preamble).toMatch(/# 9\. Module Configuration/);
    expect(spec.preamble).toMatch(/## Behaviour notes/);
    expect(spec.preamble).toMatch(/Some preamble before scenarios\./);
  });
});

describe('parseSpec — no coverage table', () => {
  const spec = parseSpec('13', '13-reader-newsfeed.md', NO_TABLE_FIXTURE);

  it('flags hasTable=false', () => {
    expect(spec.hasTable).toBe(false);
  });

  it('marks every scenario as `none`', () => {
    expect(spec.scenarios.length).toBeGreaterThan(0);
    for (const s of spec.scenarios) {
      expect(s.status).toBe('none');
      expect(s.notes).toBe('');
    }
  });

  it('still captures titles and bodies', () => {
    expect(spec.scenarios[0].title).toBe('User opens the reader');
    expect(spec.scenarios[0].body).toContain('GIVEN I am signed in');
  });
});

describe('parseSpec — orphan table row', () => {
  const spec = parseSpec('05', '05-header.md', ORPHAN_ROW_FIXTURE);

  it('does not crash and produces only the H3-backed scenario', () => {
    expect(spec.scenarios).toHaveLength(1);
    expect(spec.scenarios[0].title).toBe('Visitor sees the masthead');
    expect(spec.scenarios[0].status).toBe('covered');
  });
});

describe('parseSpec — preamble shape', () => {
  const spec = parseSpec('07', '07-dashboard.md', PREAMBLE_FIXTURE);

  it('preamble keeps both H2s except E2E coverage', () => {
    expect(spec.preamble).toMatch(/long intro paragraph/);
    expect(spec.preamble).toMatch(/## Behaviour notes/);
    expect(spec.preamble).toMatch(/A separate H2 with body content\./);
    expect(spec.preamble).not.toMatch(/## E2E coverage/);
  });
});

describe('coverage helpers', () => {
  it('specCoverage applies the weighted formula', () => {
    const spec: Spec = {
      id: '01',
      filename: '01.md',
      title: 'Test',
      preamble: '',
      hasTable: true,
      scenarios: [
        { title: 'a', status: 'covered', notes: '', body: '' },
        { title: 'b', status: 'covered', notes: '', body: '' },
        { title: 'c', status: 'partial', notes: '', body: '' },
        { title: 'd', status: 'fixme', notes: '', body: '' },
        { title: 'e', status: 'none', notes: '', body: '' },
      ],
    };
    const stats = specCoverage(spec);
    expect(stats.total).toBe(5);
    expect(stats.weighted).toBe(2.5);
    expect(stats.counts).toEqual({ covered: 2, partial: 1, fixme: 1, none: 1 });
  });

  it('aggregateCoverage sums across specs', () => {
    const a = parseSpec('09', '09-module.md', FULL_TABLE_FIXTURE);
    const b = parseSpec('13', '13-reader.md', NO_TABLE_FIXTURE);
    const stats = aggregateCoverage([a, b]);
    // 4 from a (1 covered, 1 partial, 1 fixme, 1 none) + 2 from b (both none)
    expect(stats.total).toBe(6);
    expect(stats.weighted).toBe(1.5);
    expect(stats.counts).toEqual({ covered: 1, partial: 1, fixme: 1, none: 3 });
  });

  it('emptyCoverageCounts returns zeros', () => {
    expect(emptyCoverageCounts()).toEqual({ covered: 0, partial: 0, fixme: 0, none: 0 });
  });
});
