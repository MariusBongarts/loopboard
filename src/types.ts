export const WORKFLOW_STATUSES = ['todo', 'in-progress', 'in-review', 'done'] as const;
export const SIDE_STATUSES = ['blocked', 'wontfix'] as const;
// Pre-workflow stage: captured idea, not yet scheduled. Surfaced in
// the Backlog drawer (#0145), not on the kanban board.
export const PRE_WORKFLOW_STATUSES = ['backlog'] as const;
export const ALL_STATUSES = [
  ...PRE_WORKFLOW_STATUSES,
  ...WORKFLOW_STATUSES,
  ...SIDE_STATUSES,
] as const;

export const ASSIGNEES = ['agent', 'human'] as const;

export type WorkflowStatus = typeof WORKFLOW_STATUSES[number];
export type SideStatus = typeof SIDE_STATUSES[number];
export type PreWorkflowStatus = typeof PRE_WORKFLOW_STATUSES[number];
export type Status = typeof ALL_STATUSES[number];
export type Assignee = typeof ASSIGNEES[number];

// Finished work: done, or closed as wontfix.
export function isClosed(status: string): boolean {
  return status === 'done' || status === 'wontfix';
}

export interface Issue {
  id: string;
  filename: string;
  archived: boolean;
  title: string;
  category: string;
  status: Status;
  assignee: Assignee;
  project?: string;
  phase?: number;
  parent?: string;
  labels: string[];
  created?: string;
  // Sort rank within a column (1 = top). Optional; not severity.
  priority?: number;
  body: string;
  reviewed?: string;
  deployed?: string;
}

export interface ProjectSession {
  date: string;
  note: string;
}

export interface Project {
  slug: string;
  title: string;
  status: 'active' | 'shipped' | 'paused' | 'unknown';
  prdPath: string;
  wipPath: string;
  prdBody: string;
  wipBody: string;
  // Digest parsed server-side from wip.md / prd.md (#0069). Plain text;
  // issue references appear as `#NNNN`.
  focus: string;
  problem: string;
  solution: string;
  lastSession?: string;
  sessions: ProjectSession[];
}

export type ScenarioStatus = 'covered' | 'partial' | 'fixme' | 'none';

export const SCENARIO_STATUSES: readonly ScenarioStatus[] = [
  'covered',
  'partial',
  'fixme',
  'none',
] as const;

export const SCENARIO_STATUS_LABEL: Record<ScenarioStatus, string> = {
  covered: 'Covered',
  partial: 'Partial',
  fixme: 'Fixme',
  none: 'None',
};

export const SCENARIO_STATUS_GLYPH: Record<ScenarioStatus, string> = {
  covered: '✅',
  partial: '🟡',
  fixme: '⏳',
  none: '❌',
};

export interface Scenario {
  title: string;
  status: ScenarioStatus;
  notes: string;
  body: string;
}

export interface Spec {
  id: string;
  filename: string;
  title: string;
  preamble: string;
  scenarios: Scenario[];
  hasTable: boolean;
}

export interface CoverageCounts {
  covered: number;
  partial: number;
  fixme: number;
  none: number;
}

export interface CoverageStats {
  total: number;
  weighted: number;
  counts: CoverageCounts;
}

export function emptyCoverageCounts(): CoverageCounts {
  return { covered: 0, partial: 0, fixme: 0, none: 0 };
}

export function specCoverage(spec: Spec): CoverageStats {
  const counts = emptyCoverageCounts();
  for (const sc of spec.scenarios) counts[sc.status]++;
  const total = spec.scenarios.length;
  const weighted = counts.covered + 0.5 * counts.partial;
  return { total, weighted, counts };
}

export function aggregateCoverage(specs: Spec[]): CoverageStats {
  const counts = emptyCoverageCounts();
  let total = 0;
  for (const spec of specs) {
    for (const sc of spec.scenarios) {
      counts[sc.status]++;
      total++;
    }
  }
  const weighted = counts.covered + 0.5 * counts.partial;
  return { total, weighted, counts };
}

export function scenarioMatches(scenario: Scenario, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const haystack = [scenario.title, scenario.body, scenario.notes]
    .join('\n')
    .toLowerCase();
  return tokens.every((t) => haystack.includes(t));
}

export interface Workspace {
  id: string;
  name: string;
  repoPath: string;
  root: string;
}

export interface WorkspaceSummary extends Workspace {
  available: boolean;
  issueCount: number;
}

export interface ApiData {
  workspace: WorkspaceSummary;
  issues: Issue[];
  projects: Project[];
  specs: Spec[];
}

export const STANDALONE = '__standalone__';
export const ALL = '__all__';
export const ALL_ASSIGNEES = '__all_assignees__';

export type ColumnKey = Status;

// Canonical left-to-right column layout. `blocked` sits between `todo`
// and `in-progress` as a workflow stop; `wontfix` is archive-only and
// only renders when the archive toggle is on AND the column is occupied.
export const COLUMN_ORDER: ColumnKey[] = [
  'todo',
  'blocked',
  'in-progress',
  'in-review',
  'done',
  'wontfix',
];

export const ALWAYS_VISIBLE_COLUMNS: ColumnKey[] = [
  'todo',
  'blocked',
  'in-progress',
  'in-review',
  'done',
];

export const COLUMN_LABEL: Record<ColumnKey, string> = {
  'todo': 'Todo',
  'blocked': 'Blocked',
  'in-progress': 'In progress',
  'in-review': 'In review',
  'done': 'Done',
  'wontfix': 'Wontfix',
  // backlog is `Status` for typing purposes but never appears as a
  // board column — the Backlog drawer is its only surface (#0145).
  'backlog': 'Backlog',
};

// Each issue lives in the column matching its literal status.
export function columnForStatus(status: Status): ColumnKey {
  return status as ColumnKey;
}

// Column order: explicit priority first (1 = top), then id ascending.
export function byPriority(a: Issue, b: Issue): number {
  const pa = a.priority ?? Number.POSITIVE_INFINITY;
  const pb = b.priority ?? Number.POSITIVE_INFINITY;
  if (pa !== pb) return pa - pb;
  return a.id.localeCompare(b.id);
}

// Path as the repo sees it, e.g. `.agents/issues/0001-x.md` or `ai/issues/…`.
export function relativePath(issue: Pick<Issue, 'filename' | 'archived'>, rootName = '.agents'): string {
  return issue.archived ? `${rootName}/issues/_archive/${issue.filename}` : `${rootName}/issues/${issue.filename}`;
}

export function tokenizeQuery(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

export function searchMatches(issue: Issue, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const haystack = [
    issue.id,
    issue.title,
    issue.labels.join(' '),
    issue.project ?? '',
    issue.body,
  ]
    .join('\n')
    .toLowerCase();
  return tokens.every((t) => haystack.includes(t));
}
