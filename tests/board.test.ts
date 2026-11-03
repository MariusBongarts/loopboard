import { describe, expect, it } from 'vitest';
import {
  SCOPE_ALL,
  SCOPE_BACKLOG,
  SCOPE_NO_PROJECT,
  boardCardCount,
  boardScopeColumns,
  boardScopeIssues,
  boardScopeItems,
  boardScopeLabel,
  parseBoardScope,
} from '../src/board';
import type { MenuItem } from '../src/menu';
import type { Issue, Project } from '../src/types';

const issue = (id: string, over: Partial<Issue> = {}): Issue => ({
  id, filename: `${id}-x.md`, archived: false, title: `Title ${id}`, category: 'task', status: 'todo', assignee: 'agent', labels: [], body: '', ...over,
});
const project = (slug: string, over: Partial<Project> = {}): Project => ({
  slug, title: `Project ${slug}`, status: 'active', focus: '', prdBody: '', wipBody: '', sessions: [], ...over,
});

const projects = [project('01-a', { lastSession: '2026-09-01' }), project('02-b', { lastSession: '2026-09-20' }), project('03-c', { status: 'shipped' })];
const issues = [
  issue('0001', { project: '01-a' }),
  issue('0002', { project: '02-b', status: 'done' }),
  issue('0003'),
  issue('0004', { project: '01-a', status: 'backlog' }),
  issue('0005', { status: 'backlog' }),
  issue('0006', { project: '01-a', archived: true, status: 'done' }),
  issue('0007', { status: 'wontfix' }),
];
const ids = (list: Issue[]) => list.map((i) => i.id);

describe('board scope', () => {
  it('reads the query, falling back to every issue', () => {
    expect(parseBoardScope(undefined, projects)).toBe(SCOPE_ALL);
    expect(parseBoardScope('01-a', projects)).toBe('01-a');
    expect(parseBoardScope('none', projects)).toBe(SCOPE_NO_PROJECT);
    expect(parseBoardScope('backlog', projects)).toBe(SCOPE_BACKLOG);
    expect(parseBoardScope('99-gone', projects)).toBe(SCOPE_ALL);
    expect(parseBoardScope(['01-a'], projects)).toBe(SCOPE_ALL);
  });

  it('names each scope', () => {
    expect(boardScopeLabel(SCOPE_ALL, projects)).toBe('All issues');
    expect(boardScopeLabel(SCOPE_NO_PROJECT, projects)).toBe('No project');
    expect(boardScopeLabel(SCOPE_BACKLOG, projects)).toBe('Backlog');
    expect(boardScopeLabel('01-a', projects)).toBe('Project 01-a');
  });

  it('holds the issues of a scope; archived ones only on a project or no project', () => {
    expect(ids(boardScopeIssues(issues, SCOPE_ALL))).toEqual(['0001', '0002', '0003', '0004', '0005', '0007']);
    expect(ids(boardScopeIssues(issues, '01-a'))).toEqual(['0001', '0004', '0006']);
    expect(ids(boardScopeIssues(issues, SCOPE_NO_PROJECT))).toEqual(['0003', '0005', '0007']);
    expect(ids(boardScopeIssues(issues, SCOPE_BACKLOG))).toEqual(['0004', '0005']);
  });

  it('adds a Backlog column only when narrowed to the backlog', () => {
    expect(boardScopeColumns(SCOPE_ALL)).not.toContain('backlog');
    expect(boardScopeColumns('01-a')).not.toContain('backlog');
    expect(boardScopeColumns(SCOPE_BACKLOG)[0]).toBe('backlog');
  });

  it('counts the cards the columns show: no backlog or wontfix on a workflow board', () => {
    const count = (scope: string) => boardCardCount(boardScopeIssues(issues, scope), boardScopeColumns(scope));
    expect(count(SCOPE_ALL)).toBe(3);
    expect(count('01-a')).toBe(2);
    expect(count(SCOPE_BACKLOG)).toBe(2);
  });

  it('offers the fixed scopes, then open projects by last session, then shipped ones', () => {
    let picked = '';
    const entries = boardScopeItems(projects, '02-b', (s) => (picked = s));
    expect(entries.map((e) => (e === 'separator' ? e : e.id))).toEqual(['all', 'none', 'backlog', 'separator', '02-b', '01-a', 'separator', '03-c']);
    const items = entries.filter((e): e is MenuItem => e !== 'separator');
    expect(items.filter((i) => i.checked).map((i) => i.id)).toEqual(['02-b']);
    items.find((i) => i.id === 'none')?.run?.();
    expect(picked).toBe('none');
  });

  it('leaves out the separators when there are no projects', () => {
    expect(boardScopeItems([], SCOPE_ALL, () => {})).toHaveLength(3);
  });
});
