// Browser storage can be disabled or full; every access is best-effort.
export function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

// Per-workspace keys (#0008). Before workspaces, one origin was one repo, so
// the old `tracker.*` key is a sensible first value for any workspace.
export function workspaceKey(workspace: string, key: string): string {
  return `loopboard.w.${workspace}.${key}`;
}

export function readWorkspaceStored(workspace: string, key: string): string | null {
  return readStored(workspaceKey(workspace, key)) ?? readStored(`tracker.${key}`);
}

export function writeWorkspaceStored(workspace: string, key: string, value: string | null): void {
  writeStored(workspaceKey(workspace, key), value);
}
