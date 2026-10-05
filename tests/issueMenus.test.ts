import { describe, expect, it, vi } from 'vitest';
import { createLabelItem, labelItems, parentItems, projectItems, statusItems, type IssueMenuContext } from '../src/issueMenus';
import type { MenuEntry, MenuItem } from '../src/menu';
import type { Issue, Project } from '../src/types';

const issue = (id: string, over: Partial<Issue> = {}): Issue => ({
  id, filename: `${id}-x.md`, archived: false, title: `Issue ${id}`, category: 'task', status: 'todo', assignee: 'agent', labels: [], body: '', ...over,
});
const items = (entries: MenuEntry[]) => entries.filter((e): e is MenuItem => e !== 'separator');

function ctx(issues: Issue[], projects: Project[] = []): IssueMenuContext & { update: ReturnType<typeof vi.fn> } {
  return { issues, projects, update: vi.fn() };
}

describe('issue menus', () => {
  it('checks the current status and writes only a change', () => {
    const a = issue('0001');
    const c = ctx([a]);
    const list = statusItems(a, c);
    expect(list.find((i) => i.checked)?.id).toBe('status:todo');
    list.find((i) => i.id === 'status:todo')!.run!();
    list.find((i) => i.id === 'status:done')!.run!();
    expect(c.update).toHaveBeenCalledOnce();
    expect(c.update).toHaveBeenCalledWith(a, { status: 'done' });
  });

  it('toggles labels from every label in the workspace', () => {
    const a = issue('0001', { labels: ['ui'] });
    const c = ctx([a, issue('0002', { labels: ['bug', 'ui'] })]);
    const list = labelItems(a, c);
    expect(list.map((i) => [i.label, i.checked])).toEqual([['bug', false], ['ui', true]]);
    list[0].run!();
    list[1].run!();
    expect(c.update.mock.calls.map((call) => call[1])).toEqual([{ labels: ['ui', 'bug'] }, { labels: [] }]);
    expect(createLabelItem(a, c, 'a,b')).toBeNull();
    createLabelItem(a, c, ' perf ')!.run!();
    expect(c.update).toHaveBeenLastCalledWith(a, { labels: ['ui', 'perf'] });
  });

  it('offers open projects plus the current one, and No project', () => {
    const a = issue('0001', { project: '02-old' });
    const projects = [
      { slug: '01-new', title: 'New', status: 'active' },
      { slug: '02-old', title: 'Old', status: 'shipped' },
      { slug: '03-done', title: 'Done', status: 'shipped' },
    ] as Project[];
    expect(items(projectItems(a, ctx([a], projects))).map((i) => i.id)).toEqual(['project:none', 'project:01-new', 'project:02-old']);
  });

  it('never offers the issue itself or its children as a parent', () => {
    const a = issue('0001');
    const c = ctx([a, issue('0002', { parent: '0001' }), issue('0003'), issue('0004', { archived: true })]);
    expect(items(parentItems(a, c)).map((i) => i.id)).toEqual(['parent:none', 'parent:0003']);
  });
});
