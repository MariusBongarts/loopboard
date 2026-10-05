// Line-level frontmatter edits shared by the server (board writes) and the
// client (the editor's fields form). Never re-serialize the whole YAML: field
// order, comments and unknown fields must survive (#0026, ADR-0005).

export function splitFrontmatter(text: string): { frontmatter: string; body: string } {
  const m = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return m ? { frontmatter: m[0], body: text.slice(m[0].length) } : { frontmatter: '', body: text };
}

// YAML-safe scalar: plain when unambiguous, otherwise a JSON string (a valid
// YAML double-quoted scalar).
export function yamlScalar(value: string): string {
  const risky =
    value === '' ||
    /^\s|\s$/.test(value) ||
    /[:#[\]{},&*!|>'"%@`]/.test(value) ||
    /^(true|false|null|yes|no|on|off|~|-?\d[\d._]*)$/i.test(value);
  return risky ? JSON.stringify(value) : value;
}

function lineRe(key: string): RegExp {
  return new RegExp(`^(${key}:[ \\t]*)([^\\r\\n]*)$`, 'm');
}

// A trailing `# comment` after a value (outside quotes), with its spacing.
function trailingComment(rest: string): string {
  if (/^["']/.test(rest)) {
    const q = rest[0];
    let i = 1;
    for (; i < rest.length; i++) {
      if (q === '"' && rest[i] === '\\') i++;
      else if (rest[i] === q) break;
    }
    return rest.slice(i + 1).match(/^(\s+#.*)$/)?.[1] ?? '';
  }
  return rest.match(/(\s+#.*)$/)?.[1] ?? '';
}

// Replace `key:` in place (keeping a trailing comment); when missing, insert
// it after the first of `after` that exists, else append. `null` removes it.
export function setLine(fm: string, key: string, value: string | null, after: string[]): string {
  const re = lineRe(key);
  if (value === null) return fm.replace(new RegExp(`^${key}:[^\\r\\n]*(\\r?\\n)?`, 'm'), '').replace(/\n$/, '');
  if (re.test(fm)) return fm.replace(re, (_m, prefix: string, rest: string) => `${prefix}${value}${trailingComment(rest)}`);
  for (const anchor of after) {
    const a = lineRe(anchor);
    if (a.test(fm)) return fm.replace(a, (m) => `${m}\n${key}: ${value}`);
  }
  return `${fm}\n${key}: ${value}`;
}

// Value of a simple `key: value` line, unquoted; undefined when missing.
export function readField(fmInner: string, key: string): string | undefined {
  const m = fmInner.match(lineRe(key));
  if (!m) return undefined;
  const raw = m[2].replace(/\s+#.*$/, '').trim();
  if (raw.startsWith('"')) {
    try {
      return JSON.parse(raw) as string;
    } catch {
      return raw.slice(1, -1);
    }
  }
  if (raw.startsWith("'") && raw.endsWith("'")) return raw.slice(1, -1).replace(/''/g, "'");
  return raw;
}

// `labels: [a, b]` (flow style) → ["a", "b"]; null when not flow style.
export function readLabels(fmInner: string): string[] | null {
  const raw = readField(fmInner, 'labels');
  if (raw === undefined || raw === '') return [];
  if (!raw.startsWith('[') || !raw.endsWith(']')) return null;
  return raw
    .slice(1, -1)
    .split(',')
    .map((l) => l.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
}

export function formatLabels(labels: string[]): string {
  return `[${labels.map((l) => yamlScalar(l)).join(', ')}]`;
}

export interface IssueFields {
  title: string;
  status: string;
  assignee: string;
  labels: string[];
  project: string;
  parent: string;
}

// Inner frontmatter text (between the --- lines) of a whole file.
export function frontmatterInner(text: string): string | null {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : null;
}

export function readIssueFields(text: string): IssueFields | null {
  const inner = frontmatterInner(text);
  if (inner === null) return null;
  return {
    title: readField(inner, 'title') ?? '',
    status: readField(inner, 'status') ?? 'todo',
    assignee: readField(inner, 'assignee') ?? 'agent',
    labels: readLabels(inner) ?? [],
    project: readField(inner, 'project') ?? '',
    parent: readField(inner, 'parent') ?? '',
  };
}

// Apply changed fields to the file's frontmatter, line by line.
// Where each editable field goes when it is missing, so edits from the board,
// the pickers and the editor all place lines the same way.
const FIELD_ANCHORS: Record<keyof IssueFields, string[]> = {
  title: ['id'],
  status: ['category'],
  assignee: ['status'],
  project: ['assignee', 'status'],
  parent: ['project', 'assignee'],
  labels: ['parent', 'project', 'assignee'],
};

export function setIssueField(fm: string, key: keyof IssueFields, value: string | string[] | null): string {
  if (key === 'labels') return setLine(fm, 'labels', formatLabels(Array.isArray(value) ? value : []), FIELD_ANCHORS.labels);
  const text = Array.isArray(value) ? value.join(', ') : value;
  if (key === 'title') return setLine(fm, 'title', yamlScalar(text ?? ''), FIELD_ANCHORS.title);
  return setLine(fm, key, text || null, FIELD_ANCHORS[key]);
}

export function applyIssueFields(text: string, before: IssueFields, after: IssueFields): string {
  const inner = frontmatterInner(text);
  if (inner === null) return text;
  let fm = inner;
  for (const key of ['title', 'status', 'assignee', 'project', 'parent'] as const) {
    if (after[key] !== before[key]) fm = setIssueField(fm, key, after[key]);
  }
  if (after.labels.join('\u0000') !== before.labels.join('\u0000')) fm = setIssueField(fm, 'labels', after.labels);
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---/, () => `---\n${fm}\n---`);
}
