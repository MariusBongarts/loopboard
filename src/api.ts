import type { ApiData, Assignee, Status } from './types';

async function readErrorBody(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body && typeof body.error === 'string') return body.error;
    return JSON.stringify(body);
  } catch {
    try {
      return await res.text();
    } catch {
      return '';
    }
  }
}

export async function fetchData(): Promise<ApiData> {
  const res = await fetch('/api/data');
  if (!res.ok) {
    const detail = await readErrorBody(res);
    throw new Error(`GET /api/data failed: ${res.status}${detail ? ` — ${detail}` : ''}`);
  }
  return res.json();
}

export interface IssuePatch {
  status?: Status;
  assignee?: Assignee;
  reason?: string;
}

export interface PatchResult {
  status?: Status;
  assignee?: Assignee;
  appendedWhyRejected: boolean;
}

export async function patchIssue(
  id: string,
  archived: boolean,
  patch: IssuePatch,
): Promise<PatchResult> {
  const url = `/api/issues/${id}?archived=${archived}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PATCH /api/issues/${id} failed: ${res.status} ${body}`);
  }
  return res.json();
}

export async function patchIssueStatus(
  id: string,
  archived: boolean,
  status: Status,
  reason?: string,
): Promise<PatchResult> {
  return patchIssue(id, archived, { status, reason });
}

export async function patchIssueAssignee(
  id: string,
  archived: boolean,
  assignee: Assignee,
): Promise<PatchResult> {
  return patchIssue(id, archived, { assignee });
}

export async function reorderColumn(
  archived: boolean,
  status: Status,
  ids: string[],
): Promise<void> {
  const url = `/api/columns/reorder?archived=${archived}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status, ids }),
  });
  if (!res.ok) {
    const detail = await readErrorBody(res);
    throw new Error(
      `PATCH /api/columns/reorder failed: ${res.status}${detail ? ` — ${detail}` : ''}`,
    );
  }
}
