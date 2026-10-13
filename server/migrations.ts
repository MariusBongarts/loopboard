import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { Workspace } from "./workspaces";

// Workflow migrations (MIGRATIONS.md) and each harness's level — the marker
// in its AGENTS.md. Used by `init` and the Help Center's upgrade guide (#0062).

export const MIGRATION_RE = /<!-- loopboard:migration (M\d{3}) -->/;

export interface Migration {
  id: string;
  title: string;
  date: string | null;
}

export function parseMigrations(text: string): Migration[] {
  const out: Migration[] = [];
  const heading = /^## (M\d{3}) — (.+)$/gm;
  for (let m = heading.exec(text); m; m = heading.exec(text)) {
    const date = /^\*(\d{4}-\d{2}-\d{2})\b/m.exec(text.slice(m.index + m[0].length, m.index + m[0].length + 200));
    out.push({ id: m[1], title: m[2].trim(), date: date?.[1] ?? null });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

export function readMigrations(packageRoot: string): Migration[] {
  return parseMigrations(readFileSync(join(packageRoot, "MIGRATIONS.md"), "utf8"));
}

export function latestMigration(packageRoot: string): string {
  return readMigrations(packageRoot).at(-1)?.id ?? "M000";
}

// No marker means the harness predates migrations: M000.
export function harnessLevel(agentsMd: string): { level: string; marked: boolean } {
  const id = agentsMd.match(MIGRATION_RE)?.[1];
  return { level: id ?? "M000", marked: id !== undefined };
}

export type HarnessStatus = "current" | "behind" | "unmarked" | "no-agents-md" | "missing";

export interface WorkspaceHarness {
  id: string;
  name: string;
  repoPath: string;
  status: HarnessStatus;
  level: string | null;
  behind: number;
  legacy: boolean;
}

export function workspaceHarness(workspace: Workspace, migrations: Migration[]): WorkspaceHarness {
  const base = { id: workspace.id, name: workspace.name, repoPath: workspace.repoPath, legacy: basename(workspace.root) === "ai" };
  if (!existsSync(workspace.root)) return { ...base, status: "missing", level: null, behind: 0 };
  const agentsPath = join(workspace.repoPath, "AGENTS.md");
  if (!existsSync(agentsPath)) return { ...base, status: "no-agents-md", level: null, behind: migrations.length };
  const { level, marked } = harnessLevel(readFileSync(agentsPath, "utf8"));
  const behind = migrations.filter((m) => m.id > level).length;
  const status: HarnessStatus = !marked ? "unmarked" : behind > 0 ? "behind" : "current";
  return { ...base, status, level, behind };
}
