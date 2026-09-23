import { STANDALONE, searchMatches, type Issue, type Project } from './types';

// Inbox (#0069): one date-sorted feed of project sessions and filed issues,
// grouped by day. Selecting an item opens its project's board.

export type InboxFilter = 'all' | 'you' | 'sessions' | 'issues';

interface FeedBase {
  key: string;
  date: string;
  // Project slug, or STANDALONE for issues without a project.
  projectKey: string;
}
export interface SessionItem extends FeedBase {
  kind: 'session';
  note: string;
}
export interface IssueItem extends FeedBase {
  kind: 'issue';
  issue: Issue;
}
export type FeedItem = SessionItem | IssueItem;

export interface FeedDay {
  date: string;
  items: FeedItem[];
}

const CLOSED = new Set(['done', 'backlog', 'wontfix']);

export function needsYou(issue: Issue): boolean {
  return issue.assignee === 'human' && !issue.archived && !CLOSED.has(issue.status);
}

export function projectKeyFor(issue: Issue): string {
  return issue.project ?? STANDALONE;
}

export function buildFeed(issues: Issue[], projects: Project[]): FeedItem[] {
  const items: FeedItem[] = [];
  for (const p of projects) {
    for (const s of p.sessions) {
      items.push({ kind: 'session', key: `s:${p.slug}:${s.date}`, date: s.date, projectKey: p.slug, note: s.note });
    }
  }
  for (const issue of issues) {
    if (issue.archived) continue;
    items.push({ kind: 'issue', key: `i:${issue.id}`, date: issue.created ?? '', projectKey: projectKeyFor(issue), issue });
  }
  return items.sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      (a.kind === b.kind ? 0 : a.kind === 'session' ? -1 : 1) ||
      a.key.localeCompare(b.key),
  );
}

// `projectKey` narrows to one project (or STANDALONE); null keeps all.
export function filterFeed(
  feed: FeedItem[],
  filter: InboxFilter,
  projectKey: string | null = null,
): FeedItem[] {
  return feed.filter((e) => {
    if (projectKey && e.projectKey !== projectKey) return false;
    switch (filter) {
      case 'sessions':
        return e.kind === 'session';
      case 'issues':
        return e.kind === 'issue';
      case 'you':
        return e.kind === 'issue' && needsYou(e.issue);
      default:
        return true;
    }
  });
}

// Consecutive items sharing a date form one day; input is already sorted.
export function groupByDay(feed: FeedItem[]): FeedDay[] {
  const days: FeedDay[] = [];
  for (const item of feed) {
    const last = days[days.length - 1];
    if (last && last.date === item.date) last.items.push(item);
    else days.push({ date: item.date, items: [item] });
  }
  return days;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function dayLabel(iso: string, todayIsoDate: string): string {
  if (!iso) return 'No date';
  const n = daysBetween(iso, todayIsoDate);
  if (n === 0) return 'Today';
  if (n === 1) return 'Yesterday';
  const [y, m, d] = iso.split('-').map(Number);
  const wd = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const sameYear = iso.slice(0, 4) === todayIsoDate.slice(0, 4);
  return `${wd}, ${d} ${MONTHS[m - 1]}${sameYear ? '' : ` ${y}`}`;
}

// First sentence as a headline, the rest as the preview line.
export function splitNote(note: string): [string, string] {
  const m = note.match(/^(.{20,160}?[.!?;])(\s|$)/);
  if (m) return [m[1], note.slice(m[1].length).trim()];
  if (note.length <= 140) return [note, ''];
  const cut = note.lastIndexOf(' ', 130);
  const at = cut > 40 ? cut : 130;
  return [`${note.slice(0, at)}…`, note.slice(at).trim()];
}

export function itemHeadline(item: FeedItem): string {
  return item.kind === 'issue' ? item.issue.title : splitNote(item.note)[0];
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(`${fromIso}T12:00:00Z`);
  const b = Date.parse(`${toIso}T12:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function relativeDay(iso: string | undefined, todayIso: string): string {
  if (!iso) return '';
  const n = daysBetween(iso, todayIso);
  if (n <= 0) return 'today';
  if (n === 1) return 'yesterday';
  if (n < 7) return `${n}d ago`;
  if (n < 60) return `${Math.round(n / 7)}w ago`;
  return `${Math.round(n / 30)}mo ago`;
}

export function todayIso(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export type TextSegment = { kind: 'text'; value: string } | { kind: 'issue'; id: string };

export function issueRefSegments(text: string): TextSegment[] {
  const out: TextSegment[] = [];
  const re = /#(\d{4})\b/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ kind: 'text', value: text.slice(last, at) });
    out.push({ kind: 'issue', id: m[1] });
    last = at + m[0].length;
  }
  if (last < text.length) out.push({ kind: 'text', value: text.slice(last) });
  return out;
}

// Leading project number of a slug: `29-android-app-release` → `29`.
export function prdNumber(slug: string | undefined): string {
  return slug?.match(/^(\d+)-/)?.[1] ?? '';
}

function projectHaystack(p: Project | undefined): string {
  return p ? `${p.slug} ${p.title}` : 'standalone';
}

// Every token must appear somewhere in the item or its project's name.
export function searchFeed(
  feed: FeedItem[],
  tokens: string[],
  projectsBySlug: Map<string, Project>,
): FeedItem[] {
  if (tokens.length === 0) return feed;
  return feed.filter((e) => {
    const proj = projectHaystack(projectsBySlug.get(e.projectKey)).toLowerCase();
    if (e.kind === 'issue') {
      return tokens.every((t) => proj.includes(t) || searchMatches(e.issue, [t]));
    }
    const text = `${e.note} ${proj}`.toLowerCase();
    return tokens.every((t) => text.includes(t));
  });
}

export function searchProjects(projects: Project[], tokens: string[]): Project[] {
  if (tokens.length === 0) return projects;
  return projects.filter((p) => {
    const text = `${projectHaystack(p)} ${p.focus}`.toLowerCase();
    return tokens.every((t) => text.includes(t));
  });
}

export function projectsByLastSession(projects: Project[]): Project[] {
  return [...projects].sort(
    (a, b) => (b.lastSession ?? '').localeCompare(a.lastSession ?? '') || a.slug.localeCompare(b.slug),
  );
}
