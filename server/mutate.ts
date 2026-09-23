import { readFile, writeFile } from 'node:fs/promises';
import matter from 'gray-matter';
import { ALL_STATUSES, ASSIGNEES, type Assignee, type Status } from './issues';

export interface IssuePatch {
  status?: string;
  assignee?: string;
  priority?: number;
  reason?: string;
}

export interface MutationResult {
  ok: true;
  status?: Status;
  assignee?: Assignee;
  priority?: number;
  appendedWhyRejected: boolean;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;
const STATUS_LINE_RE = /^(status:\s*)([^\r\n]*)$/m;
const ASSIGNEE_LINE_RE = /^(assignee:\s*)([^\r\n]*)$/m;
const PRIORITY_LINE_RE = /^(priority:\s*)([^\r\n]*)$/m;

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
    patch.priority === undefined
  ) {
    throw Object.assign(
      new Error('patch must include at least one of status, assignee, priority'),
      { statusCode: 400 },
    );
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
  const parsed = matter(raw);
  const fm = parsed.data as Record<string, unknown>;
  const currentStatus = String(fm.status ?? 'todo');

  const fmMatch = raw.match(FRONTMATTER_RE);
  if (!fmMatch) {
    throw Object.assign(new Error('no frontmatter found'), { statusCode: 422 });
  }

  let fmBlock = fmMatch[1];

  if (patch.status !== undefined) {
    if (STATUS_LINE_RE.test(fmBlock)) {
      fmBlock = fmBlock.replace(STATUS_LINE_RE, `$1${patch.status}`);
    } else {
      fmBlock = `${fmBlock}\nstatus: ${patch.status}`;
    }
  }

  if (patch.assignee !== undefined) {
    if (ASSIGNEE_LINE_RE.test(fmBlock)) {
      fmBlock = fmBlock.replace(ASSIGNEE_LINE_RE, `$1${patch.assignee}`);
    } else if (STATUS_LINE_RE.test(fmBlock)) {
      // Insert immediately after the status: line so related fields stay
      // visually grouped in frontmatter.
      fmBlock = fmBlock.replace(
        STATUS_LINE_RE,
        (m) => `${m}\nassignee: ${patch.assignee}`,
      );
    } else {
      fmBlock = `${fmBlock}\nassignee: ${patch.assignee}`;
    }
  }

  if (patch.priority !== undefined) {
    if (PRIORITY_LINE_RE.test(fmBlock)) {
      fmBlock = fmBlock.replace(PRIORITY_LINE_RE, `$1${patch.priority}`);
    } else if (ASSIGNEE_LINE_RE.test(fmBlock)) {
      fmBlock = fmBlock.replace(
        ASSIGNEE_LINE_RE,
        (m) => `${m}\npriority: ${patch.priority}`,
      );
    } else if (STATUS_LINE_RE.test(fmBlock)) {
      fmBlock = fmBlock.replace(
        STATUS_LINE_RE,
        (m) => `${m}\npriority: ${patch.priority}`,
      );
    } else {
      fmBlock = `${fmBlock}\npriority: ${patch.priority}`;
    }
  }

  let body = parsed.content;
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
      const sep = body.endsWith('\n\n') ? '' : body.endsWith('\n') ? '\n' : '\n\n';
      body = `${body}${sep}## Why rejected\n\n${trimmedReason}\n`;
      appended = true;
    }
  }

  const rebuilt = `---\n${fmBlock}\n---${body.startsWith('\n') ? '' : '\n'}${body}`;
  await writeFile(filePath, rebuilt, 'utf8');

  return {
    ok: true,
    status: patch.status as Status | undefined,
    assignee: patch.assignee as Assignee | undefined,
    priority: patch.priority,
    appendedWhyRejected: appended,
  };
}
