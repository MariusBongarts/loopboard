import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { normalize, resolve, sep } from "node:path";
import { serialized, writeFileAtomic } from "./files";

// Document store for in-app editing (#0024, ADR-0005). Reads return a
// content hash; writes must send the hash they started from, so an agent's
// edit in between is a 409 conflict instead of a silent overwrite.

export class DocError extends Error {
  constructor(readonly statusCode: number, message: string, readonly current?: { content: string; hash: string }) {
    super(message);
  }
}

export interface Doc {
  path: string;
  content: string;
  hash: string;
}

export function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 20);
}

// Only markdown files under the root; no traversal, no absolute paths.
export function resolveDoc(root: string, relPath: string): string {
  const clean = normalize(relPath).split("\\").join("/");
  if (!clean.endsWith(".md") || clean.startsWith("/") || clean.split("/").includes("..")) {
    throw new DocError(400, `not an editable document: ${relPath}`);
  }
  const abs = resolve(root, clean);
  if (!abs.startsWith(resolve(root) + sep)) throw new DocError(400, `outside the root: ${relPath}`);
  return abs;
}

export async function readDoc(root: string, relPath: string): Promise<Doc> {
  const abs = resolveDoc(root, relPath);
  try {
    if (!(await stat(abs)).isFile()) throw new Error();
  } catch {
    throw new DocError(404, `no such document: ${relPath}`);
  }
  const content = await readFile(abs, "utf8");
  return { path: relPath, content, hash: hashContent(content) };
}

export function writeDoc(root: string, relPath: string, content: string, baseHash: string): Promise<Doc> {
  return serialized(resolveDoc(root, relPath), () => writeChecked(root, relPath, content, baseHash));
}

async function writeChecked(root: string, relPath: string, content: string, baseHash: string): Promise<Doc> {
  const current = await readDoc(root, relPath);
  if (current.hash !== baseHash) {
    throw new DocError(409, "changed on disk since you started editing", { content: current.content, hash: current.hash });
  }
  if (current.content !== content) await writeFileAtomic(resolveDoc(root, relPath), content);
  return { path: relPath, content, hash: hashContent(content) };
}
