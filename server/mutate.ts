import { readFile } from 'node:fs/promises';
import { setLine } from '../shared/frontmatter';
import { writeFileAtomic } from './files';
import { parseFrontmatter } from './frontmatter';
import { ALL_STATUSES, ASSIGNEES, type Assignee, type Status } from './issues';

export interface IssuePatch {
  status?: string;
  assignee?: string;
  priority?: number;
  reason?: string;
  // Optional review/deploy markers (#0039, #0040): a date sets, null removes.
  reviewed?: string | null;
  deployed?: string | null;
}

export interface MutationResult {
  ok: true;
  status?: Status;
  assignee?: Assignee;
  priority?: number;
  reviewed?: string | null;
  deployed?: string | null;
  appendedWhyRejected: boolean;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isStatus(value: string): value is Status {
  return (ALL_STATUSES as readonly string[]).includes(value);
}

function isAssignee(value: string): value is Assignee {
  return (ASSIGNEES as readonly string[]).includes(value);
}

export async function mutateIssue(
  filePath: string,
  patch: IssuePatch,
): Promise<MutationResult> {
  if (
    patch.status === undefined &&
    patch.assignee === undefined &&
    patch.priority === undefined &&
    patch.reviewed === undefined &&
    patch.deployed === undefined
  ) {
    throw Object.assign(
      new Error('patch must include at least one of status, assignee, priority, reviewed, deployed'),
      { statusCode: 400 },
    );
  }
  for (const key of ['reviewed', 'deployed'] as const) {
    const v = patch[key];
    if (v !== undefined && v !== null && !DATE_RE.test(v)) {
      throw Object.assign(new Error(`${key} must be a YYYY-MM-DD date or null`), { statusCode: 400 });
    }
  }
  if (patch.status !== undefined && !isStatus(patch.status)) {
    throw Object.assign(new Error(`unknown status: ${patch.status}`), { statusCode: 400 });
  }
  if (patch.assignee !== undefined && !isAssignee(patch.assignee)) {
    throw Object.assign(new Error(`unknown assignee: ${patch.assignee}`), { statusCode: 400 });
  }
  if (
    patch.priority !== undefined &&
    (!Number.isInteger(patch.priority) || patch.priority < 1)
  ) {
    throw Object.assign(
      new Error(`priority must be an integer ≥ 1, got: ${patch.priority}`),
      { statusCode: 400 },
    );
  }

  const raw = await readFile(filePath, 'utf8');
  const parsed = parseFrontmatter(raw);
  const fm = parsed.data as Record<string, unknown>;
  const currentStatus = String(fm.status ?? 'todo');

  const fmMatch = raw.match(FRONTMATTER_RE);
  if (!fmMatch) {
    throw Object.assign(new Error('no frontmatter found'), { statusCode: 422 });
  }

  let fmBlock = fmMatch[1];

  if (patch.status !== undefined) fmBlock = setLine(fmBlock, 'status', patch.status, []);
  if (patch.assignee !== undefined) fmBlock = setLine(fmBlock, 'assignee', patch.assignee, ['status']);
  if (patch.priority !== undefined) {
    fmBlock = setLine(fmBlock, 'priority', String(patch.priority), ['assignee', 'status']);
  }
  if (patch.reviewed !== undefined) fmBlock = setLine(fmBlock, 'reviewed', patch.reviewed, ['created']);
  if (patch.deployed !== undefined) fmBlock = setLine(fmBlock, 'deployed', patch.deployed, ['reviewed', 'created']);

  const body = parsed.content;
  // Replace only the frontmatter block inside the original text, so the body
  // — down to the blank line after `---` — keeps its exact bytes.
  let rebuilt = raw.replace(FRONTMATTER_RE, () => `---\n${fmBlock}\n---`);
  let appended = false;

  const enteringWontfix =
    patch.status === 'wontfix' && currentStatus !== 'wontfix';
  if (enteringWontfix) {
    const trimmedReason = (patch.reason ?? '').trim();
    if (!trimmedReason) {
      throw Object.assign(
        new Error('wontfix requires a non-empty "reason" string'),
        { statusCode: 400 },
      );
    }
    if (!/^##\s+Why rejected\b/m.test(body)) {
      const sep = rebuilt.endsWith('\n\n') ? '' : rebuilt.endsWith('\n') ? '\n' : '\n\n';
      rebuilt = `${rebuilt}${sep}## Why rejected\n\n${trimmedReason}\n`;
      appended = true;
    }
  }

  await writeFileAtomic(filePath, rebuilt);

  return {
    ok: true,
    status: patch.status as Status | undefined,
    assignee: patch.assignee as Assignee | undefined,
    priority: patch.priority,
    reviewed: patch.reviewed,
    deployed: patch.deployed,
    appendedWhyRejected: appended,
  };
}
