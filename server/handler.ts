import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { basename, dirname, join } from "node:path";
import {
  ALL_STATUSES,
  findIssueFile,
  readAllIssues,
  readAllProjects,
  type Status,
} from "./issues";
import { issueActivity } from "./activity";
import { createIssue, createProject } from "./create";
import { DocError, readDoc, writeDoc } from "./docs";
import { mutateIssue, type IssuePatch } from "./mutate";
import { readMigrations, workspaceHarness } from "./migrations";
import { packageRoot, packageVersion } from "./paths";
import { guardRequest } from "./security";
import { readAllSpecs } from "./specs";
import { loadViews, saveViews, validViews } from "./views";
import { watchHub } from "./watch";
import {
  loadRegistry,
  registerWorkspace,
  removeWorkspace,
  renameWorkspace,
  setLastUsed,
  detectRoot,
  summarize,
  type Workspace,
} from "./workspaces";

// Framework-free API used by both the Vite dev plugin and the CLI server
// (ADR-0001). Every repo-scoped route lives under /api/w/:workspace.

export interface ApiContext {
  configDir: string;
}

export type ApiHandler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;

export class HttpError extends Error {
  constructor(readonly statusCode: number, message: string) {
    super(message);
  }
}

export function json(res: ServerResponse, code: number, body: unknown): void {
  res.statusCode = code;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

export async function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(raw || "{}") as T;
  } catch {
    throw new HttpError(400, "invalid JSON body");
  }
}

export async function findWorkspace(ctx: ApiContext, id: string): Promise<Workspace> {
  const registry = await loadRegistry(ctx.configDir);
  const workspace = registry.workspaces.find((w) => w.id === id);
  if (!workspace) throw new HttpError(404, `unknown workspace: ${id}`);
  return workspace;
}

export interface RouteMatch {
  params: string[];
  query: URLSearchParams;
}

export type Route = {
  method: string;
  pattern: RegExp;
  run: (ctx: ApiContext, req: IncomingMessage, res: ServerResponse, m: RouteMatch) => Promise<void>;
};

const routes: Route[] = [];

export function route(method: string, pattern: RegExp, run: Route["run"]): void {
  routes.push({ method, pattern, run });
}

route("GET", /^\/api\/health$/, async (_ctx, _req, res) => {
  json(res, 200, { name: "loopboard", version: packageVersion(), pid: process.pid });
});

// The Help Center's upgrade guide: this package, its migrations and each
// registered harness's level (#0061, #0062).
route("GET", /^\/api\/harness$/, async (ctx, _req, res) => {
  const root = packageRoot();
  const migrations = readMigrations(root);
  const registry = await loadRegistry(ctx.configDir);
  json(res, 200, {
    version: packageVersion(),
    packagePath: root,
    latest: migrations.at(-1)?.id ?? "M000",
    migrations,
    workspaces: registry.workspaces.map((w) => workspaceHarness(w, migrations)),
  });
});

route("GET", /^\/api\/workspaces$/, async (ctx, _req, res) => {
  const registry = await loadRegistry(ctx.configDir);
  json(res, 200, { workspaces: registry.workspaces.map(summarize), lastUsed: registry.lastUsed ?? null });
});

route("POST", /^\/api\/workspaces$/, async (ctx, req, res) => {
  const body = await readJsonBody<{ path?: unknown }>(req);
  if (typeof body.path !== "string" || !body.path.trim()) throw new HttpError(400, "path is required");
  const workspace = await registerWorkspace(ctx.configDir, expandHome(body.path.trim()));
  json(res, 201, { workspace: summarize(workspace) });
});

route("PATCH", /^\/api\/workspaces\/([^/]+)$/, async (ctx, req, res, m) => {
  const body = await readJsonBody<{ name?: unknown }>(req);
  if (typeof body.name !== "string" || !body.name.trim()) throw new HttpError(400, "name is required");
  const workspace = await renameWorkspace(ctx.configDir, m.params[0], body.name);
  if (!workspace) throw new HttpError(404, `unknown workspace: ${m.params[0]}`);
  json(res, 200, { workspace: summarize(workspace) });
});

route("DELETE", /^\/api\/workspaces\/([^/]+)$/, async (ctx, _req, res, m) => {
  if (!(await removeWorkspace(ctx.configDir, m.params[0]))) {
    throw new HttpError(404, `unknown workspace: ${m.params[0]}`);
  }
  json(res, 200, { ok: true });
});

// Everything waiting on the human, across every workspace (#0023).
route("GET", /^\/api\/needs-you$/, async (ctx, _req, res) => {
  const registry = await loadRegistry(ctx.configDir);
  const groups = await Promise.all(
    registry.workspaces.map(async (w) => {
      const summary = summarize(w);
      if (!summary.available) return { workspace: { id: w.id, name: w.name }, available: false, items: [] };
      const items = (await readAllIssues(w.root))
        .filter(
          (i) =>
            !i.archived &&
            ((i.assignee === "human" && i.status !== "done" && i.status !== "wontfix") || i.status === "blocked")
        )
        .sort((a, b) => (b.created ?? "").localeCompare(a.created ?? "") || b.id.localeCompare(a.id))
        .map(({ id, title, status, assignee, project, created }) => ({ id, title, status, assignee, project, created }));
      return { workspace: { id: w.id, name: w.name }, available: true, items };
    })
  );
  json(res, 200, { groups });
});

// Folder picker for "Add workspace" (#0009): directory names only, never
// file contents. Browsers can't hand a local server an absolute path.
route("GET", /^\/api\/fs\/suggest$/, async (_ctx, _req, res, m) => {
  const input = expandHome(m.query.get("path") ?? "");
  if (!input.startsWith("/") && !/^[A-Za-z]:[\\/]/.test(input)) {
    json(res, 200, { suggestions: [] });
    return;
  }
  const endsWithSep = /[\\/]$/.test(input);
  const dir = endsWithSep ? input : dirname(input);
  const prefix = endsWithSep ? "" : basename(input).toLowerCase();
  let entries: { name: string; isDirectory(): boolean }[] = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    json(res, 200, { suggestions: [] });
    return;
  }
  const suggestions = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith(".") && e.name.toLowerCase().startsWith(prefix))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 30)
    .map((e) => {
      const path = join(dir, e.name);
      return { name: e.name, path, hasRoot: detectRoot(path) !== null };
    });
  json(res, 200, { suggestions });
});

route("GET", /^\/api\/w\/([^/]+)\/data$/, async (ctx, _req, res, m) => {
  const workspace = await findWorkspace(ctx, m.params[0]);
  const summary = summarize(workspace);
  if (!summary.available) {
    json(res, 200, { workspace: summary, issues: [], projects: [], specs: [] });
    return;
  }
  const [issues, projects, specs] = await Promise.all([
    readAllIssues(workspace.root),
    readAllProjects(workspace.root),
    readAllSpecs(workspace.root),
  ]);
  await setLastUsed(ctx.configDir, workspace.id);
  json(res, 200, { workspace: summary, issues, projects, specs });
});

// Server-Sent Events: "change" whenever files under the root change (#0010).
route("GET", /^\/api\/w\/([^/]+)\/events$/, async (ctx, req, res, m) => {
  const workspace = await findWorkspace(ctx, m.params[0]);
  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-store",
    connection: "keep-alive",
  });
  res.write("retry: 2000\n\nevent: ready\ndata: {}\n\n");
  const unsubscribe = watchHub.subscribe(workspace.root, () => {
    res.write(`event: change\ndata: ${JSON.stringify({ at: Date.now() })}\n\n`);
  });
  const heartbeat = setInterval(() => res.write(": ping\n\n"), 25_000);
  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

route("GET", /^\/api\/w\/([^/]+)\/views$/, async (ctx, _req, res, m) => {
  const workspace = await findWorkspace(ctx, m.params[0]);
  json(res, 200, { views: await loadViews(ctx.configDir, workspace.id) });
});

route("PUT", /^\/api\/w\/([^/]+)\/views$/, async (ctx, req, res, m) => {
  const workspace = await findWorkspace(ctx, m.params[0]);
  const views = validViews((await readJsonBody<{ views?: unknown }>(req)).views);
  if (!views) throw new HttpError(400, "views must be [{ id, name, query }]");
  await saveViews(ctx.configDir, workspace.id, views);
  json(res, 200, { views });
});

route("GET", /^\/api\/w\/([^/]+)\/doc$/, async (ctx, _req, res, m) => {
  const workspace = await findWorkspace(ctx, m.params[0]);
  json(res, 200, await readDoc(workspace.root, m.query.get("path") ?? ""));
});

route("PUT", /^\/api\/w\/([^/]+)\/doc$/, async (ctx, req, res, m) => {
  const workspace = await findWorkspace(ctx, m.params[0]);
  const body = await readJsonBody<{ path?: unknown; content?: unknown; baseHash?: unknown }>(req);
  if (typeof body.path !== "string" || typeof body.content !== "string" || typeof body.baseHash !== "string") {
    throw new HttpError(400, "path, content and baseHash are required");
  }
  try {
    json(res, 200, await writeDoc(workspace.root, body.path, body.content, body.baseHash));
  } catch (err) {
    if (err instanceof DocError && err.statusCode === 409) {
      json(res, 409, { error: err.message, current: err.current });
      return;
    }
    throw err;
  }
});

route("POST", /^\/api\/w\/([^/]+)\/issues$/, async (ctx, req, res, m) => {
  const workspace = await findWorkspace(ctx, m.params[0]);
  const body = await readJsonBody<Record<string, unknown>>(req);
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  const created = await createIssue(workspace.root, {
    title: str(body.title) ?? "",
    category: str(body.category) ?? "task",
    status: str(body.status) as Status | undefined,
    assignee: str(body.assignee) as "agent" | "human" | undefined,
    project: str(body.project) || undefined,
    labels: Array.isArray(body.labels) ? body.labels.filter((l): l is string => typeof l === "string") : [],
  });
  json(res, 201, created);
});

route("POST", /^\/api\/w\/([^/]+)\/projects$/, async (ctx, req, res, m) => {
  const workspace = await findWorkspace(ctx, m.params[0]);
  const body = await readJsonBody<{ title?: unknown }>(req);
  json(res, 201, await createProject(workspace.root, typeof body.title === "string" ? body.title : ""));
});

route("PATCH", /^\/api\/w\/([^/]+)\/columns\/reorder$/, async (ctx, req, res, m) => {
  const workspace = await findWorkspace(ctx, m.params[0]);
  const archived = m.query.get("archived") === "true";
  const parsed = await readJsonBody<{ status?: unknown; ids?: unknown }>(req);
  const { status, ids } = parsed;
  if (typeof status !== "string" || !(ALL_STATUSES as readonly string[]).includes(status)) {
    throw new HttpError(400, `unknown status: ${String(status)}`);
  }
  if (status === "backlog") throw new HttpError(400, "backlog has no column ordering");
  if (!Array.isArray(ids) || ids.some((v) => typeof v !== "string")) {
    throw new HttpError(400, "ids must be an array of strings");
  }
  const idList = ids as string[];
  if (idList.length === 0) throw new HttpError(400, "ids must not be empty");
  if (new Set(idList).size !== idList.length) throw new HttpError(400, "ids must be unique");
  const bucket = (await readAllIssues(workspace.root)).filter(
    (i) => i.archived === archived && i.status === (status as Status)
  );
  const bucketIds = new Set(bucket.map((i) => i.id));
  const payloadIds = new Set(idList);
  const missing = idList.filter((id) => !bucketIds.has(id));
  const extra = bucket.filter((i) => !payloadIds.has(i.id)).map((i) => i.id);
  if (missing.length > 0 || extra.length > 0) {
    json(res, 400, { error: "ids do not match the current bucket", missing, extra });
    return;
  }
  for (let i = 0; i < idList.length; i++) {
    const filePath = findIssueFile(idList[i], archived, workspace.root);
    if (!filePath) throw new HttpError(404, `issue ${idList[i]} not found`);
    await mutateIssue(filePath, { priority: i + 1 });
  }
  json(res, 200, { ok: true, count: idList.length });
});

route("GET", /^\/api\/w\/([^/]+)\/issues\/(\d{4})\/activity$/, async (ctx, _req, res, m) => {
  const workspace = await findWorkspace(ctx, m.params[0]);
  const filePath = findIssueFile(m.params[1], m.query.get("archived") === "true", workspace.root);
  if (!filePath) throw new HttpError(404, `issue ${m.params[1]} not found`);
  json(res, 200, issueActivity(filePath, m.params[1]));
});

route("PATCH", /^\/api\/w\/([^/]+)\/issues\/(\d{4})$/, async (ctx, req, res, m) => {
  const workspace = await findWorkspace(ctx, m.params[0]);
  const id = m.params[1];
  const archived = m.query.get("archived") === "true";
  const filePath = findIssueFile(id, archived, workspace.root);
  if (!filePath) throw new HttpError(404, `issue ${id} not found`);
  const patch = await readJsonBody<IssuePatch>(req);
  const project = typeof patch.project === "string" ? patch.project.trim() : "";
  if (project && !existsSync(join(workspace.root, "projects", project))) throw new HttpError(400, `no project ${project}`);
  json(res, 200, await mutateIssue(filePath, patch));
});

function expandHome(path: string): string {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  return path === "~" ? home : path.startsWith("~/") ? home + path.slice(1) : path;
}

export function createApiHandler(ctx: ApiContext): ApiHandler {
  return async (req, res) => {
    try {
      const rejected = guardRequest(req);
      if (rejected) {
        json(res, 403, { error: rejected });
        return;
      }
      const url = new URL(req.url ?? "/", "http://loopboard.local");
      const method = req.method ?? "GET";
      for (const r of routes) {
        if (r.method !== method) continue;
        const match = url.pathname.match(r.pattern);
        if (!match) continue;
        await r.run(ctx, req, res, { params: match.slice(1).map(decodeURIComponent), query: url.searchParams });
        return;
      }
      json(res, 404, { error: `no route for ${method} ${url.pathname}` });
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message?: string };
      // Server faults go to the log with their stack; 4xx are expected answers.
      if ((e.statusCode ?? 500) >= 500) console.error("[loopboard] handler error:", err);
      if (!res.headersSent) json(res, e.statusCode ?? 500, { error: e.message ?? "internal error" });
    }
  };
}
