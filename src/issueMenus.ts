import { toneClass } from './colors';
import type { MenuEntry, MenuItem } from './menu';
import { COLUMN_LABEL, type Assignee, type Issue, type Project, type Status } from './types';

// Property menus for one issue (#0052, #0055), shared by the inline pickers
// and the right-click menu. Pure: the caller supplies data and the writer.
export interface IssueEdit {
  status?: Status;
  assignee?: Assignee;
  labels?: string[];
  // '' removes the line.
  project?: string;
  parent?: string;
}

export interface IssueMenuContext {
  issues: Issue[];
  projects: Project[];
  update(issue: Issue, edit: IssueEdit): void;
}

export const STATUS_MENU_ORDER: Status[] = ['backlog', 'todo', 'in-progress', 'in-review', 'done', 'blocked', 'wontfix'];

export function statusItems(issue: Issue, ctx: IssueMenuContext): MenuItem[] {
  return STATUS_MENU_ORDER.map((status) => ({
    id: `status:${status}`,
    label: COLUMN_LABEL[status],
    status,
    checked: issue.status === status,
    run: () => issue.status !== status && ctx.update(issue, { status }),
  }));
}

export function assigneeItems(issue: Issue, ctx: IssueMenuContext): MenuItem[] {
  return (['agent', 'human'] as const).map((assignee) => ({
    id: `assignee:${assignee}`,
    label: assignee === 'agent' ? 'Agent' : 'You',
    assignee,
    checked: issue.assignee === assignee,
    run: () => issue.assignee !== assignee && ctx.update(issue, { assignee }),
  }));
}

// Every label in the workspace; picking toggles it and keeps the menu open.
export function labelItems(issue: Issue, ctx: IssueMenuContext): MenuItem[] {
  const all = [...new Set([...ctx.issues.flatMap((i) => i.labels), ...issue.labels])].sort((a, b) => a.localeCompare(b));
  return all.map((label) => ({
    id: `label:${label}`,
    label,
    tone: toneClass(label),
    checked: issue.labels.includes(label),
    keepOpen: true,
    run: () =>
      ctx.update(issue, {
        labels: issue.labels.includes(label) ? issue.labels.filter((l) => l !== label) : [...issue.labels, label],
      }),
  }));
}

export function createLabelItem(issue: Issue, ctx: IssueMenuContext, text: string): MenuItem | null {
  const label = text.trim();
  if (!label || /[,[\]#\r\n]/.test(label) || label.length > 40) return null;
  return { id: `create:${label}`, label: `Create label "${label}"`, keepOpen: true, run: () => ctx.update(issue, { labels: [...issue.labels, label] }) };
}

export function projectItems(issue: Issue, ctx: IssueMenuContext): MenuEntry[] {
  const open = ctx.projects.filter((p) => p.status !== 'shipped' || p.slug === issue.project);
  return [
    { id: 'project:none', label: 'No project', checked: !issue.project, run: () => issue.project && ctx.update(issue, { project: '' }) },
    'separator',
    ...open.map((p) => ({
      id: `project:${p.slug}`,
      label: p.title,
      hint: p.slug.slice(0, 2),
      tone: toneClass(p.slug),
      toneShape: 'square' as const,
      checked: issue.project === p.slug,
      run: () => issue.project !== p.slug && ctx.update(issue, { project: p.slug }),
    })),
  ];
}

// Live issues other than this one; a parent can't be one of its own children.
export function parentItems(issue: Issue, ctx: IssueMenuContext): MenuEntry[] {
  const candidates = ctx.issues
    .filter((i) => !i.archived && i.id !== issue.id && i.parent !== issue.id)
    .sort((a, b) => b.id.localeCompare(a.id));
  return [
    { id: 'parent:none', label: 'No parent', checked: !issue.parent, run: () => issue.parent && ctx.update(issue, { parent: '' }) },
    'separator',
    ...candidates.map((i) => ({
      id: `parent:${i.id}`,
      label: i.title,
      hint: `#${i.id}`,
      status: i.status,
      checked: issue.parent === i.id,
      run: () => issue.parent !== i.id && ctx.update(issue, { parent: i.id }),
    })),
  ];
}
