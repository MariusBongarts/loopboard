import type { IncomingMessage } from "node:http";

// loopboard writes files, so a web page must not be able to reach it: reject
// foreign Host headers (DNS rebinding) and foreign Origins on writes (ADR-0001).
const LOOPBACK_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

export function isAllowedHost(host: string | undefined, port: number): boolean {
  if (!host) return false;
  return LOOPBACK_HOSTS.some((h) => host === `${h}:${port}` || (port === 80 && host === h));
}

export function isAllowedOrigin(origin: string | undefined, host: string | undefined): boolean {
  if (!origin) return true;
  return origin === `http://${host}`;
}

export function guardRequest(req: IncomingMessage): string | null {
  const port = req.socket.localPort ?? 0;
  const host = req.headers.host;
  if (!isAllowedHost(host, port)) return `host not allowed: ${host ?? "(none)"}`;
  const method = req.method ?? "GET";
  if (method !== "GET" && method !== "HEAD" && !isAllowedOrigin(req.headers.origin, host)) {
    return `origin not allowed: ${req.headers.origin}`;
  }
  return null;
}
