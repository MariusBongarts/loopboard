import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect, Plugin } from "vite";
import {
  ALL_STATUSES,
  findIssueFile,
  readAllIssues,
  readAllProjects,
  type Status,
} from "./issues";
import { mutateIssue } from "./mutate";
import { readAllSpecs } from "./specs";

function json(res: ServerResponse, code: number, body: unknown) {
  res.statusCode = code;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

export function trackerApi(options?: { basePath?: string }): Plugin {
  const basePath = options?.basePath ?? "ai";
  return {
    name: "issue-tracker-api",
    configureServer(server) {
      const handler: Connect.NextHandleFunction = async (req, res, next) => {
        try {
          const url = req.url ?? "";
          if (req.method === "GET" && url === "/api/data") {
            const [issues, projects, specs] = await Promise.all([
              readAllIssues(basePath),
              readAllProjects(basePath),
              readAllSpecs(basePath),
            ]);
            return json(res, 200, { issues, projects, specs });
          }

          const reorderMatch = url.match(
            /^\/api\/columns\/reorder\?archived=(true|false)$/
          );
          if (req.method === "PATCH" && reorderMatch) {
            const archived = reorderMatch[1] === "true";
            const raw = await readBody(req);
            let parsed: { status?: string; ids?: unknown };
            try {
              parsed = JSON.parse(raw || "{}");
            } catch {
              return json(res, 400, { error: "invalid JSON body" });
            }
            const status = parsed.status;
            const ids = parsed.ids;
            if (
              typeof status !== "string" ||
              !(ALL_STATUSES as readonly string[]).includes(status)
            ) {
              return json(res, 400, { error: `unknown status: ${status}` });
            }
            if (status === "backlog") {
              return json(res, 400, {
                error: "backlog has no column ordering",
              });
            }
            if (!Array.isArray(ids) || ids.some((v) => typeof v !== "string")) {
              return json(res, 400, {
                error: "ids must be an array of strings",
              });
            }
            const idList = ids as string[];
            if (idList.length === 0) {
              return json(res, 400, { error: "ids must not be empty" });
            }
            if (new Set(idList).size !== idList.length) {
              return json(res, 400, { error: "ids must be unique" });
            }
            const allIssues = await readAllIssues(basePath);
            const bucket = allIssues.filter(
              (i) => i.archived === archived && i.status === (status as Status)
            );
            const bucketIds = new Set(bucket.map((i) => i.id));
            const payloadIds = new Set(idList);
            const missing = idList.filter((id) => !bucketIds.has(id));
            const extra = bucket
              .filter((i) => !payloadIds.has(i.id))
              .map((i) => i.id);
            if (missing.length > 0 || extra.length > 0) {
              return json(res, 400, {
                error: "ids do not match the current bucket",
                missing,
                extra,
              });
            }
            for (let i = 0; i < idList.length; i++) {
              const id = idList[i];
              const filePath = findIssueFile(id, archived, basePath);
              if (!filePath)
                return json(res, 404, { error: `issue ${id} not found` });
              await mutateIssue(filePath, { priority: i + 1 });
            }
            return json(res, 200, { ok: true, count: idList.length });
          }

          const patchMatch = url.match(
            /^\/api\/issues\/(\d{4})(?:\?archived=(true|false))?$/
          );
          if (req.method === "PATCH" && patchMatch) {
            const id = patchMatch[1];
            const archived = patchMatch[2] === "true";
            const filePath = findIssueFile(id, archived, basePath);
            if (!filePath)
              return json(res, 404, { error: `issue ${id} not found` });

            const raw = await readBody(req);
            let parsed: {
              status?: string;
              assignee?: string;
              priority?: number;
              reason?: string;
            };
            try {
              parsed = JSON.parse(raw || "{}");
            } catch {
              return json(res, 400, { error: "invalid JSON body" });
            }
            if (
              parsed.status === undefined &&
              parsed.assignee === undefined &&
              parsed.priority === undefined
            ) {
              return json(res, 400, {
                error: "missing status, assignee, or priority",
              });
            }
            const result = await mutateIssue(filePath, parsed);
            return json(res, 200, result);
          }

          next();
        } catch (err: unknown) {
          const e = err as { statusCode?: number; message?: string };
          // Log the full stack to the dev server so the maintainer can
          // diagnose without re-running curl. The body still carries the
          // message for the UI banner. See #0095.
          console.error("[tracker] handler error:", err);
          json(res, e.statusCode ?? 500, {
            error: e.message ?? "internal error",
          });
        }
      };
      server.middlewares.use(handler);
    },
  };
}
