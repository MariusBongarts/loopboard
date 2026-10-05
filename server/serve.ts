import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, normalize, resolve, sep } from "node:path";
import { createApiHandler, json } from "./handler";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".map": "application/json; charset=utf-8",
};

export interface ServeOptions {
  configDir: string;
  clientDir: string;
  port: number;
  host?: string;
}

// Static client + API on loopback only (ADR-0001). Unknown non-API paths get
// index.html so client routes like /w/:id survive a reload.
export function createAppServer(opts: ServeOptions): Server {
  const handleApi = createApiHandler({ configDir: opts.configDir });
  const clientDir = resolve(opts.clientDir);
  return createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://loopboard.local");
    if (url.pathname.startsWith("/api/")) {
      void handleApi(req, res);
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      json(res, 405, { error: "method not allowed" });
      return;
    }
    let file = normalize(join(clientDir, decodeURIComponent(url.pathname)));
    if (!file.startsWith(clientDir + sep) && file !== clientDir) {
      json(res, 403, { error: "forbidden" });
      return;
    }
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(clientDir, "index.html");
    res.statusCode = 200;
    res.setHeader("content-type", TYPES[extname(file)] ?? "application/octet-stream");
    if (file.includes(`${sep}assets${sep}`)) res.setHeader("cache-control", "public, max-age=31536000, immutable");
    createReadStream(file).pipe(res);
  });
}

// Tries `port`, then the next ones, like the dev server does.
export function listen(server: Server, port: number, host = "127.0.0.1", attempts = 20): Promise<number> {
  return new Promise((resolvePort, reject) => {
    let current = port;
    const tryListen = () => {
      server.once("error", onError);
      server.listen(current, host, () => {
        server.off("error", onError);
        resolvePort((server.address() as AddressInfo).port);
      });
    };
    const onError = (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE" && current < port + attempts) {
        current += 1;
        tryListen();
      } else reject(err);
    };
    tryListen();
  });
}
