import { inject, provide, type ComputedRef, type InjectionKey, type Ref } from 'vue';
import type { SavedView } from './api';
import type { RelationIndex } from './relations';
import type { Issue, Project, Workspace } from './types';

// The views inside a workspace; each has its own route.
export type View = 'feed' | 'specs' | 'projects' | 'issues';

export interface WorkspaceContext {
  id: ComputedRef<string>;
  // Root folder relative to the repo: `.agents` or a legacy `ai`.
  rootName: ComputedRef<string>;
  issues: Ref<Issue[]>;
  projects: Ref<Project[]>;
  relations: ComputedRef<RelationIndex>;
  views: Ref<SavedView[]>;
  saveViews(views: SavedView[]): Promise<void>;
}

const WORKSPACE_KEY: InjectionKey<WorkspaceContext> = Symbol('workspace');

export function provideWorkspace(ctx: WorkspaceContext): void {
  provide(WORKSPACE_KEY, ctx);
}

export function useWorkspace(): WorkspaceContext {
  const ctx = inject(WORKSPACE_KEY);
  if (!ctx) throw new Error('useWorkspace() outside a workspace view');
  return ctx;
}

export function rootNameOf(workspace: Pick<Workspace, 'repoPath' | 'root'>): string {
  const { repoPath, root } = workspace;
  if (root.startsWith(repoPath) && root.length > repoPath.length) {
    return root.slice(repoPath.length + 1).replace(/\\/g, '/');
  }
  return '.agents';
}
