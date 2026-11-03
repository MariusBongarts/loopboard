import { inProject, projectsByLastSession } from './inbox';
import type { MenuEntry } from './menu';
import { toneClass } from './colors';
import { ALWAYS_VISIBLE_COLUMNS, type ColumnKey, type Issue, type Project } from './types';

// What the Board view shows (#0138), kept in `?scope=`: every project (the
// default), one project's slug, issues without a project, or the backlog.
// Slugs are `NN-slug`, so these words can't name a project.
export const SCOPE_ALL = 'all';
export const SCOPE_NO_PROJECT = 'none';
export const SCOPE_BACKLOG = 'backlog';

export function parseBoardScope(value: unknown, projects: Project[]): string {
  if (value === SCOPE_NO_PROJECT || value === SCOPE_BACKLOG) return value;
  return projects.find((p) => p.slug === value)?.slug ?? SCOPE_ALL;
}

export function boardScopeLabel(scope: string, projects: Project[]): string {
  if (scope === SCOPE_ALL) return 'All issues';
  if (scope === SCOPE_NO_PROJECT) return 'No project';
  if (scope === SCOPE_BACKLOG) return 'Backlog';
  return projects.find((p) => p.slug === scope)?.title ?? scope;
}

// All leaves archived issues out: across every project they would bury Done.
export function boardScopeIssues(issues: Issue[], scope: string): Issue[] {
  if (scope === SCOPE_ALL) return issues.filter((i) => !i.archived);
  if (scope === SCOPE_BACKLOG) return issues.filter((i) => !i.archived && i.status === 'backlog');
  return issues.filter((i) => inProject(i, scope === SCOPE_NO_PROJECT ? null : scope));
}

// The backlog gets its own column; the empty workflow columns next to it are
// where an idea is dropped to schedule it.
export function boardScopeColumns(scope: string): ColumnKey[] {
  return scope === SCOPE_BACKLOG ? ['backlog', ...ALWAYS_VISIBLE_COLUMNS] : ALWAYS_VISIBLE_COLUMNS;
}

// Cards the columns show, given the issues of a scope.
export function boardCardCount(issues: Issue[], columns: ColumnKey[]): number {
  return issues.filter((i) => i.archived || columns.includes(i.status)).length;
}

export function boardScopeItems(projects: Project[], scope: string, pick: (scope: string) => void): MenuEntry[] {
  const fixed = [SCOPE_ALL, SCOPE_NO_PROJECT, SCOPE_BACKLOG].map((s) => ({
    id: s,
    label: boardScopeLabel(s, projects),
    checked: scope === s,
    ...(s === SCOPE_BACKLOG ? { status: 'backlog' as const } : {}),
    run: () => pick(s),
  }));
  const projectItem = (p: Project) => ({
    id: p.slug,
    label: p.title,
    hint: p.slug.slice(0, 2),
    tone: toneClass(p.slug),
    toneShape: 'square' as const,
    checked: scope === p.slug,
    run: () => pick(p.slug),
  });
  const open = projectsByLastSession(projects.filter((p) => p.status !== 'shipped'));
  const shipped = projectsByLastSession(projects.filter((p) => p.status === 'shipped'));
  return [
    ...fixed,
    ...(open.length ? (['separator'] as const) : []),
    ...open.map(projectItem),
    ...(shipped.length ? (['separator'] as const) : []),
    ...shipped.map(projectItem),
  ];
}
