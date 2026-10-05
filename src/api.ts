import type { ApiData, Assignee, Status, WorkspaceSummary } from './types';

async function errorDetail(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body && typeof body.error === 'string') return body.error;
    return JSON.stringify(body);
  } catch {
    return '';
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await errorDetail(res);
    throw new Error(detail || `${method} ${url} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

const ws = (id: string) => `/api/w/${encodeURIComponent(id)}`;

export function fetchWorkspaces(): Promise<{ workspaces: WorkspaceSummary[]; lastUsed: string | null }> {
  return request('GET', '/api/workspaces');
}

export async function addWorkspace(path: string): Promise<WorkspaceSummary> {
  return (await request<{ workspace: WorkspaceSummary }>('POST', '/api/workspaces', { path })).workspace;
}

export async function renameWorkspace(id: string, name: string): Promise<WorkspaceSummary> {
  return (await request<{ workspace: WorkspaceSummary }>('PATCH', `/api/workspaces/${encodeURIComponent(id)}`, { name }))
    .workspace;
}

export async function removeWorkspace(id: string): Promise<void> {
  await request('DELETE', `/api/workspaces/${encodeURIComponent(id)}`);
}

export function fetchData(workspace: string): Promise<ApiData> {
  return request('GET', `${ws(workspace)}/data`);
}

export interface IssuePatch {
  status?: Status;
  assignee?: Assignee;
  reason?: string;
  reviewed?: string | null;
  deployed?: string | null;
  labels?: string[];
  project?: string | null;
  parent?: string | null;
}

export interface PatchResult {
  status?: Status;
  assignee?: Assignee;
  appendedWhyRejected: boolean;
}

export function patchIssue(workspace: string, id: string, archived: boolean, patch: IssuePatch): Promise<PatchResult> {
  return request('PATCH', `${ws(workspace)}/issues/${id}?archived=${archived}`, patch);
}

export async function reorderColumn(workspace: string, archived: boolean, status: Status, ids: string[]): Promise<void> {
  await request('PATCH', `${ws(workspace)}/columns/reorder?archived=${archived}`, { status, ids });
}

export interface PathSuggestion {
  name: string;
  path: string;
  hasRoot: boolean;
}

export async function suggestPaths(path: string): Promise<PathSuggestion[]> {
  return (await request<{ suggestions: PathSuggestion[] }>('GET', `/api/fs/suggest?path=${encodeURIComponent(path)}`))
    .suggestions;
}

export interface NewIssue {
  title: string;
  category: string;
  status: Status;
  assignee: Assignee;
  project?: string;
}

export function createIssue(workspace: string, input: NewIssue): Promise<{ id: string; filename: string }> {
  return request('POST', `${ws(workspace)}/issues`, input);
}

export function createProject(workspace: string, title: string): Promise<{ slug: string }> {
  return request('POST', `${ws(workspace)}/projects`, { title });
}

export interface NeedsYouItem {
  id: string;
  title: string;
  status: Status;
  assignee: Assignee;
  project?: string;
  created?: string;
}

export interface NeedsYouGroup {
  workspace: { id: string; name: string };
  available: boolean;
  items: NeedsYouItem[];
}

export async function fetchNeedsYou(): Promise<NeedsYouGroup[]> {
  return (await request<{ groups: NeedsYouGroup[] }>('GET', '/api/needs-you')).groups;
}

export interface Doc {
  path: string;
  content: string;
  hash: string;
}

export function fetchDoc(workspace: string, path: string): Promise<Doc> {
  return request('GET', `${ws(workspace)}/doc?path=${encodeURIComponent(path)}`);
}

export type SaveResult = { ok: true; doc: Doc } | { ok: false; current: { content: string; hash: string } };

// A 409 is an expected answer here (someone else changed the file), not an error.
export async function saveDoc(workspace: string, path: string, content: string, baseHash: string): Promise<SaveResult> {
  const res = await fetch(`${ws(workspace)}/doc`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path, content, baseHash }),
  });
  if (res.status === 409) {
    const body = (await res.json()) as { current: { content: string; hash: string } };
    return { ok: false, current: body.current };
  }
  if (!res.ok) throw new Error((await errorDetail(res)) || `save failed: ${res.status}`);
  return { ok: true, doc: (await res.json()) as Doc };
}

export interface Activity {
  git: boolean;
  commits: { hash: string; date: string; subject: string }[];
  branches: string[];
  history: { hash: string; date: string; subject: string; status?: string; change?: string }[];
}

export function fetchActivity(workspace: string, id: string, archived: boolean): Promise<Activity> {
  return request('GET', `${ws(workspace)}/issues/${id}/activity?archived=${archived}`);
}

export interface SavedView {
  id: string;
  name: string;
  query: Record<string, string>;
}

export async function fetchViews(workspace: string): Promise<SavedView[]> {
  return (await request<{ views: SavedView[] }>('GET', `${ws(workspace)}/views`)).views;
}

export async function storeViews(workspace: string, views: SavedView[]): Promise<SavedView[]> {
  return (await request<{ views: SavedView[] }>('PUT', `${ws(workspace)}/views`, { views })).views;
}
