import { needsYou } from './inbox';
import { isClosed, type Issue, type Project } from './types';

// Project progress for the projects overview (#0029).
export interface Phase {
  name: string;
  ids: string[];
}

export interface Progress {
  closed: number;
  total: number;
}

export interface ProjectProgress extends Progress {
  phases: (Phase & Progress)[];
  needsYou: number;
}

const ISSUE_REF_RE = /issues\/(?:_archive\/)?(\d{4})-|#(\d{4})\b/g;

// `### Phase …` headings under `## Phases`, each with the issues it lists.
export function parsePhases(wipBody: string): Phase[] {
  const section = wipBody.match(/^## Phases[ \t]*\r?\n([\s\S]*?)(?=^## |(?![\s\S]))/m)?.[1] ?? '';
  const phases: Phase[] = [];
  for (const chunk of section.split(/^(?=### )/m)) {
    const heading = chunk.match(/^###\s+(.+?)\s*$/m);
    // Dated headings are journal entries that strayed into the section.
    if (!heading || /^\d{4}-\d{2}-\d{2}/.test(heading[1])) continue;
    const ids = new Set<string>();
    for (const m of chunk.matchAll(ISSUE_REF_RE)) ids.add(m[1] ?? m[2]);
    phases.push({ name: heading[1], ids: [...ids] });
  }
  return phases;
}

export function projectProgress(project: Project, issues: Issue[]): ProjectProgress {
  const own = issues.filter((i) => i.project === project.slug);
  const status = new Map<string, string>();
  for (const i of own) if (!status.has(i.id) || !i.archived) status.set(i.id, i.status);
  // Backlog ideas aren't scheduled work: they'd keep a project below 100%.
  for (const [id, s] of status) if (s === 'backlog') status.delete(id);
  const count = (ids: string[]): Progress => {
    const known = ids.filter((id) => status.has(id));
    return { closed: known.filter((id) => isClosed(status.get(id)!)).length, total: known.length };
  };
  const all = [...status.keys()];
  return {
    ...count(all),
    phases: parsePhases(project.wipBody)
      .map((p) => ({ ...p, ...count(p.ids) }))
      .filter((p) => p.total > 0),
    needsYou: own.filter(needsYou).length,
  };
}
