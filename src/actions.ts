import { inject, provide, type InjectionKey } from 'vue';
import type { Issue, Project } from './types';

// Actions any component inside a workspace can trigger without passing
// events up through every layer (cards, drawers, panes).
export interface IssueActions {
  openIssue(issue: Issue): void;
  copyIssuePrompt(issue: Issue): void;
  copyProjectPrompt(project: Project): void;
  setReviewed(issue: Issue, reviewed: boolean): void;
}

const KEY: InjectionKey<IssueActions> = Symbol('issue-actions');

export function provideIssueActions(actions: IssueActions): void {
  provide(KEY, actions);
}

export function useIssueActions(): IssueActions {
  const actions = inject(KEY);
  if (!actions) throw new Error('useIssueActions() outside a workspace view');
  return actions;
}
