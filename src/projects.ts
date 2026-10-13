import { needsYou, prdNumber } from './inbox';
import { isClosed, type Issue, type Project } from './types';

// Project progress for the projects overview (#0029).
export interface Phase {
  name: string;
  ids: string[];
}

export interface Progress {
  closed: number;
  total: number;
}

export interface ProjectProgress extends Progress {
  phases: (Phase & Progress)[];
  needsYou: number;
}

const ISSUE_REF_RE = /issues\/(?:_archive\/)?(\d{4})-|#(\d{4})\b/g;

// `### Phase …` headings under `## Phases`, each with the issues it lists.
export function parsePhases(wipBody: string): Phase[] {
  const section = wipBody.match(/^## Phases[ \t]*\r?\n([\s\S]*?)(?=^## |(?![\s\S]))/m)?.[1] ?? '';
  const phases: Phase[] = [];
  for (const chunk of section.split(/^(?=### )/m)) {
    const heading = chunk.match(/^###\s+(.+?)\s*$/m);
    // Dated headings are journal entries that strayed into the section.
    if (!heading || /^\d{4}-\d{2}-\d{2}/.test(heading[1])) continue;
    const ids = new Set<string>();
    for (const m of chunk.matchAll(ISSUE_REF_RE)) ids.add(m[1] ?? m[2]);
    phases.push({ name: heading[1], ids: [...ids] });
  }
  return phases;
}

export function projectProgress(project: Project, issues: Issue[]): ProjectProgress {
  const own = issues.filter((i) => i.project === project.slug);
  const status = new Map<string, string>();
  for (const i of own) if (!status.has(i.id) || !i.archived) status.set(i.id, i.status);
  // Backlog ideas aren't scheduled work: they'd keep a project below 100%.
  for (const [id, s] of status) if (s === 'backlog') status.delete(id);
  const count = (ids: string[]): Progress => {
    const known = ids.filter((id) => status.has(id));
    return { closed: known.filter((id) => isClosed(status.get(id)!)).length, total: known.length };
  };
  const all = [...status.keys()];
  return {
    ...count(all),
    phases: parsePhases(project.wipBody)
      .map((p) => ({ ...p, ...count(p.ids) }))
      .filter((p) => p.total > 0),
    needsYou: own.filter(needsYou).length,
  };
}

export function percent(closed: number, total: number): number {
  return total ? Math.round((closed / total) * 100) : 0;
}

// Ordering inside each Active / Paused / Shipped group (#0069).
export type ProjectSort = 'active' | 'newest' | 'progress' | 'you' | 'name';

export const PROJECT_SORTS: { value: ProjectSort; label: string }[] = [
  { value: 'active', label: 'Last active' },
  { value: 'newest', label: 'Newest' },
  { value: 'progress', label: 'Progress' },
  { value: 'you', label: 'Needs you' },
  { value: 'name', label: 'Name' },
];

export function parseProjectSort(value: string | null): ProjectSort {
  return PROJECT_SORTS.find((s) => s.value === value)?.value ?? 'active';
}

export interface ProjectRow {
  project: Project;
  progress: ProjectProgress;
}

const byLastActive = (a: ProjectRow, b: ProjectRow) => (b.project.lastSession ?? '').localeCompare(a.project.lastSession ?? '');
const byName = (a: ProjectRow, b: ProjectRow) => a.project.title.localeCompare(b.project.title);
// Projects with nothing scheduled have no progress to rank, so they go last.
const ratio = ({ progress: p }: ProjectRow) => (p.total ? p.closed / p.total : -1);

const COMPARE: Record<ProjectSort, (a: ProjectRow, b: ProjectRow) => number> = {
  active: (a, b) => byLastActive(a, b) || byName(a, b),
  newest: (a, b) => Number(prdNumber(b.project.slug) || -1) - Number(prdNumber(a.project.slug) || -1) || byName(a, b),
  progress: (a, b) => ratio(b) - ratio(a) || byLastActive(a, b),
  you: (a, b) => b.progress.needsYou - a.progress.needsYou || byLastActive(a, b),
  name: byName,
};

export function sortProjectRows(rows: ProjectRow[], sort: ProjectSort): ProjectRow[] {
  return [...rows].sort(COMPARE[sort]);
}
