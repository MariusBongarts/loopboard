import { readFile } from 'node:fs/promises';
import { setIssueField, setLine } from '../shared/frontmatter';
import { serialized, writeFileAtomic } from './files';
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
  // Inline property pickers (#0052): empty or null removes the line.
  labels?: string[];
  project?: string | null;
  parent?: string | null;
}

export interface MutationResult {
  ok: true;
  status?: Status;
  assignee?: Assignee;
  priority?: number;
  reviewed?: string | null;
  deployed?: string | null;
  labels?: string[];
  project?: string | null;
  parent?: string | null;
  appendedWhyRejected: boolean;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PROJECT_RE = /^\d{2}-[a-z0-9][a-z0-9-]*$/;
const LABEL_RE = /^[^,\[\]\r\n#]{1,40}$/;

function badRequest(message: string): Error {
  return Object.assign(new Error(message), { statusCode: 400 });
}

// Labels, project and parent as the pickers send them, validated and tidied.
function cleanPickerFields(patch: IssuePatch, ownId: string): Pick<IssuePatch, 'labels' | 'project' | 'parent'> {
  const out: Pick<IssuePatch, 'labels' | 'project' | 'parent'> = {};
  if (patch.labels !== undefined) {
    if (!Array.isArray(patch.labels) || patch.labels.some((l) => typeof l !== 'string')) throw badRequest('labels must be a list of strings');
    const labels = [...new Set(patch.labels.map((l) => l.trim()).filter(Boolean))];
    const bad = labels.find((l) => !LABEL_RE.test(l));
    if (bad !== undefined) throw badRequest(`invalid label: ${bad}`);
    out.labels = labels;
  }
  if (patch.project !== undefined) {
    const project = (patch.project ?? '').trim();
    if (project && !PROJECT_RE.test(project)) throw badRequest(`invalid project: ${project}`);
    out.project = project || null;
  }
  if (patch.parent !== undefined) {
    const parent = (patch.parent ?? '').trim();
    if (parent && !/^\d{1,4}$/.test(parent)) throw badRequest(`parent must be an issue number, got: ${parent}`);
    const padded = parent ? parent.padStart(4, '0') : null;
    if (padded && padded === ownId) throw badRequest('an issue cannot be its own parent');
    out.parent = padded;
  }
  return out;
}

function isStatus(value: string): value is Status {
  return (ALL_STATUSES as readonly string[]).includes(value);
}

function isAssignee(value: string): value is Assignee {
  return (ASSIGNEES as readonly string[]).includes(value);
}

export function mutateIssue(filePath: string, patch: IssuePatch): Promise<MutationResult> {
  return serialized(filePath, () => applyPatch(filePath, patch));
}

async function applyPatch(filePath: string, patch: IssuePatch): Promise<MutationResult> {
  const FIELDS = ['status', 'assignee', 'priority', 'reviewed', 'deployed', 'labels', 'project', 'parent'] as const;
  if (FIELDS.every((k) => patch[k] === undefined)) {
    throw badRequest(`patch must include at least one of ${FIELDS.join(', ')}`);
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
  const ownId = String(fm.id ?? '').padStart(4, '0');
  const picked = cleanPickerFields(patch, ownId);
  if (picked.project !== undefined) fmBlock = setIssueField(fmBlock, 'project', picked.project);
  if (picked.parent !== undefined) fmBlock = setIssueField(fmBlock, 'parent', picked.parent);
  if (picked.labels !== undefined) fmBlock = setIssueField(fmBlock, 'labels', picked.labels);

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
    ...picked,
    appendedWhyRejected: appended,
  };
}
