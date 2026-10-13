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
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
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

// `Range: bytes=a-b` for media (#0064): Safari only plays video that can be
// fetched in parts. Returns null for a missing or multi-range header, and
// "unsatisfiable" when the range lies outside the file.
export function parseRange(header: string | undefined, size: number): { start: number; end: number } | "unsatisfiable" | null {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header?.trim() ?? "");
  if (!m || (m[1] === "" && m[2] === "")) return null;
  let start: number;
  let end: number;
  if (m[1] === "") {
    start = Math.max(0, size - Number(m[2]));
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  return start > end || start >= size ? "unsatisfiable" : { start, end };
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
    const size = statSync(file).size;
    res.setHeader("content-type", TYPES[extname(file)] ?? "application/octet-stream");
    res.setHeader("accept-ranges", "bytes");
    if (file.includes(`${sep}assets${sep}`)) res.setHeader("cache-control", "public, max-age=31536000, immutable");
    const range = parseRange(req.headers.range, size);
    if (range === "unsatisfiable") {
      res.statusCode = 416;
      res.setHeader("content-range", `bytes */${size}`);
      res.end();
      return;
    }
    if (range) {
      res.statusCode = 206;
      res.setHeader("content-range", `bytes ${range.start}-${range.end}/${size}`);
      res.setHeader("content-length", range.end - range.start + 1);
    } else {
      res.statusCode = 200;
      res.setHeader("content-length", size);
    }
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    createReadStream(file, range ?? {}).pipe(res);
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
