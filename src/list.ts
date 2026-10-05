import { ALL_STATUSES, COLUMN_LABEL, COLUMN_ORDER, type Issue, type Status } from './types';

// The list view's filters and grouping (#0031). Filters round-trip through
// the URL query, so a saved view (#0032) is just a named query.
export type GroupBy = 'status' | 'project' | 'label' | 'none';

export interface ListFilters {
  group: GroupBy;
  who: 'all' | 'human' | 'agent';
  statuses: Status[]; // empty = all
  label: string; // '' = any
  q: string;
}

export const DEFAULT_FILTERS: ListFilters = { group: 'status', who: 'all', statuses: [], label: '', q: '' };

export function filtersFromQuery(query: Record<string, unknown>): ListFilters {
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const group = str(query.group);
  const who = str(query.who);
  return {
    group: (['status', 'project', 'label', 'none'] as const).find((g) => g === group) ?? 'status',
    who: who === 'human' || who === 'agent' ? who : 'all',
    statuses: str(query.status)
      .split(',')
      .filter((s): s is Status => (ALL_STATUSES as readonly string[]).includes(s)),
    label: str(query.label),
    q: str(query.q),
  };
}

export function filtersToQuery(f: ListFilters): Record<string, string> {
  const out: Record<string, string> = {};
  if (f.group !== 'status') out.group = f.group;
  if (f.who !== 'all') out.who = f.who;
  if (f.statuses.length) out.status = f.statuses.join(',');
  if (f.label) out.label = f.label;
  if (f.q) out.q = f.q;
  return out;
}

export function filterIssues(issues: Issue[], f: ListFilters): Issue[] {
  const words = f.q.toLowerCase().split(/\s+/).filter(Boolean);
  return issues.filter((i) => {
    if (i.archived) return false;
    if (f.who !== 'all' && i.assignee !== f.who) return false;
    if (f.statuses.length && !f.statuses.includes(i.status)) return false;
    if (f.label && !i.labels.includes(f.label)) return false;
    if (words.length) {
      const hay = `${i.id} ${i.title} ${i.labels.join(' ')} ${i.project ?? ''}`.toLowerCase();
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  });
}

export interface Group {
  key: string;
  label: string;
  issues: Issue[];
}

const newestFirst = (a: Issue, b: Issue) => (b.created ?? '').localeCompare(a.created ?? '') || b.id.localeCompare(a.id);

export function groupIssues(issues: Issue[], by: GroupBy, projectTitle: (slug: string) => string = (s) => s): Group[] {
  const sorted = [...issues].sort(newestFirst);
  if (by === 'none') return [{ key: 'all', label: 'All issues', issues: sorted }];
  const groups = new Map<string, Issue[]>();
  const add = (key: string, i: Issue) => groups.set(key, [...(groups.get(key) ?? []), i]);
  for (const i of sorted) {
    if (by === 'status') add(i.status, i);
    else if (by === 'project') add(i.project ?? '', i);
    else if (i.labels.length) for (const l of i.labels) add(l, i);
    else add('', i);
  }
  const keys = [...groups.keys()];
  // Same order as the board's columns, backlog first.
  const order: string[] = ['backlog', ...COLUMN_ORDER];
  if (by === 'status') keys.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  else keys.sort((a, b) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)));
  return keys.map((key) => ({
    key,
    label:
      by === 'status'
        ? COLUMN_LABEL[key as Status]
        : key === ''
          ? by === 'project'
            ? 'No project'
            : 'No label'
          : by === 'project'
            ? projectTitle(key)
            : key,
    issues: groups.get(key)!,
  }));
}
