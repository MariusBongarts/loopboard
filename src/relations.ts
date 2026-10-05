import { isClosed, type Issue } from './types';

// Blocking relations from `parent:` (#0028): the only relation there is.
export interface RelationIndex {
  parentOf(issue: Issue): Issue | 'missing' | null;
  childrenOf(issue: Issue): Issue[];
  isWaiting(issue: Issue): boolean; // open, and its parent isn't done
}

export function buildRelations(issues: Issue[]): RelationIndex {
  // A live issue wins over an archived one with the same number.
  const byId = new Map<string, Issue>();
  for (const i of issues) {
    const seen = byId.get(i.id);
    if (!seen || (seen.archived && !i.archived)) byId.set(i.id, i);
  }
  const children = new Map<string, Issue[]>();
  for (const i of issues) {
    if (!i.parent || i.archived) continue;
    const list = children.get(i.parent) ?? [];
    list.push(i);
    children.set(i.parent, list);
  }
  return {
    parentOf: (issue) => (issue.parent ? byId.get(issue.parent) ?? 'missing' : null),
    childrenOf: (issue) => (children.get(issue.id) ?? []).slice().sort((a, b) => a.id.localeCompare(b.id)),
    isWaiting: (issue) => {
      if (!issue.parent || isClosed(issue.status) || issue.archived) return false;
      const parent = byId.get(issue.parent);
      return !parent || !isClosed(parent.status);
    },
  };
}
