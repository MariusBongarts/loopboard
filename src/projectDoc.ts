import { marked } from 'marked';
import type { Issue } from './types';
import { columnForStatus } from './types';

export type DocMode = 'prd' | 'wip';

// Links pointing at issue files: ../../issues/NNNN-...md or
// ../../issues/_archive/NNNN-...md (any number of leading `../`).
const ISSUE_LINK_RE = /(?:^|\/)issues\/(_archive\/)?(\d{4})-[a-z0-9-]+\.md$/i;

// Secondary H2s collapsed into <details>. Anything else stays open.
const COLLAPSED_HEADINGS = new Set([
  'activity log',
  'deferred / out of scope',
  'ship summary',
  'out of scope',
  'further notes',
  'testing decisions',
]);

function statusPillClass(status: Issue['status']): string {
  const col = columnForStatus(status);
  if (['blocked', 'needs-info', 'ready-for-human', 'wontfix'].includes(col)) {
    return `pill pill-side ${col}`;
  }
  return `pill pill-status ${col}`;
}

export function issueFromHref(href: string, issues: Issue[]): Issue | null {
  const m = href.match(ISSUE_LINK_RE);
  if (!m) return null;
  const archived = !!m[1];
  const id = m[2];
  return issues.find((i) => i.id === id && i.archived === archived) ?? null;
}

function postProcess(html: string, mode: DocMode, issues: Issue[]): string {
  const root = document.createElement('div');
  root.innerHTML = html;

  // WIP phase checklists get a live status pill next to each issue link.
  if (mode === 'wip') {
    root.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((a) => {
      const issue = issueFromHref(a.getAttribute('href') ?? '', issues);
      if (!issue) return;
      const li = a.closest('li');
      if (!li || li.querySelector(':scope > .pill')) return;
      const pill = document.createElement('span');
      pill.className = statusPillClass(issue.status);
      pill.textContent = issue.status;
      li.appendChild(pill);
    });
  }

  const children = Array.from(root.children);
  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    if (node.tagName !== 'H2') continue;
    if (!COLLAPSED_HEADINGS.has((node.textContent ?? '').trim().toLowerCase())) continue;
    const details = document.createElement('details');
    details.className = 'doc-collapsed';
    const summary = document.createElement('summary');
    summary.textContent = node.textContent ?? '';
    details.appendChild(summary);
    let j = i + 1;
    while (j < children.length && children[j].tagName !== 'H2') {
      details.appendChild(children[j]);
      j++;
    }
    node.replaceWith(details);
  }
  return root.innerHTML;
}

export function renderProjectDoc(md: string, mode: DocMode, issues: Issue[]): string {
  if (!md) return '';
  const raw = marked.parse(md, { gfm: true, breaks: false }) as string;
  return postProcess(raw, mode, issues);
}

// Click delegate for rendered docs: resolves issue links, returns the issue
// (and prevents navigation) or null for ordinary links.
export function issueFromDocClick(e: MouseEvent, issues: Issue[]): Issue | null {
  const anchor = (e.target as HTMLElement | null)?.closest('a[href]') as HTMLAnchorElement | null;
  if (!anchor) return null;
  const issue = issueFromHref(anchor.getAttribute('href') ?? '', issues);
  if (issue) e.preventDefault();
  return issue;
}
