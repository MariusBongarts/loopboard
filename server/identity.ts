import { readFileSync } from "node:fs";
import { join } from "node:path";
import { frontmatterInner, readField, readList, yamlScalar } from "../shared/frontmatter";
import { printable, quoted } from "../shared/printable";

// A harness's identity file (ADR-0007) and the rules for the id it carries
// (ADR-0008). `init --kind docs` writes the file (#0078); the registry reads
// it from #0079 on.

export const IDENTITY_FILE = ".agents/harness.md";

export const ID_RULE =
  "lowercase letters, digits and hyphens, 2 to 32 characters, starting with a letter and ending with a letter or digit";

const ID_RE = /^[a-z][a-z0-9-]{0,30}[a-z0-9]$/;

// A closed list: each word would read as something else where an id stands.
export const RESERVED_IDS = [
  "http", "https", "mailto", "file", "ftp", "tel",
  "github",
  "true", "false", "null", "yes", "no", "on", "off",
  "workspace",
] as const;

// Why `id` can't be a harness id or an alias; null when it can.
export function idProblem(id: string): string | null {
  if ((RESERVED_IDS as readonly string[]).includes(id)) return "is a reserved word";
  if (ID_RE.test(id)) return null;
  if (/^\d/.test(id)) return "starts with a digit";
  if (id.length < 2) return "is shorter than 2 characters";
  if (id.length > 32) return "is longer than 32 characters";
  return "doesn't fit the pattern";
}

export const HARNESS_TYPES = ["code", "docs"] as const;
export type HarnessType = (typeof HARNESS_TYPES)[number];

export interface Identity {
  id: string;
  name: string;
  kind: "harness";
  type: HarnessType;
  parent: string | null;
  created: string;
}

// A name is any text, a folder's name included. Plain only when it starts
// with a letter, so YAML reads no number, date or indicator into it.
function nameScalar(name: string): string {
  return /^\p{L}/u.test(name) && yamlScalar(name) === name && printable(name) === name ? name : quoted(name);
}

const PURPOSE = "<!-- One paragraph: what this folder is for. People and agents read it first. -->";

export function renderIdentity(identity: Identity): string {
  return [
    "---",
    "schema: 1",
    `id: ${identity.id}`,
    `name: ${nameScalar(identity.name)}`,
    `kind: ${identity.kind}`,
    `type: ${identity.type}`,
    `parent: ${identity.parent ?? "null"}`,
    `created: ${identity.created}`,
    "---",
    "",
    PURPOSE,
    "",
  ].join("\n");
}

// What `init` reads of an identity file, each field as its line has it:
// `id`, `parent` and `aliases` never go through YAML (ADR-0007).
export interface IdentityLines {
  id?: string;
  name?: string;
  type?: string;
  parent?: string;
  aliases: string[];
}

// null when the folder has no identity file, or one that can't be read.
export function readIdentity(folder: string): IdentityLines | null {
  let text: string;
  try {
    text = readFileSync(join(folder, IDENTITY_FILE), "utf8");
  } catch {
    return null;
  }
  const inner = frontmatterInner(text) ?? "";
  const field = (key: string) => readField(inner, key);
  return { id: field("id"), name: field("name"), type: field("type"), parent: field("parent"), aliases: readList(inner, "aliases") ?? [] };
}
