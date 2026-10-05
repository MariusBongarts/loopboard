import { statSync } from "node:fs";
import { git, gitLocate } from "./git";

// What happened to an issue, from local git only (#0030): commits that
// mention it, branches named after it, and its file's own history with
// status changes read from each version's frontmatter.

export interface CommitRef {
  hash: string;
  date: string;
  subject: string;
}

export interface HistoryEntry extends CommitRef {
  status?: string;
  change?: string; // "todo → in-progress"
}

export interface Activity {
  git: boolean;
  commits: CommitRef[];
  branches: string[];
  history: HistoryEntry[];
}

const SEP = "\x1f";
const REC = "\x1e";
const cache = new Map<string, { stamp: string; value: Activity }>();

function parseCommits(out: string | null): CommitRef[] {
  return (out ?? "")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [hash, date, subject] = line.split(SEP);
      return { hash, date, subject };
    });
}

export function issueActivity(filePath: string, id: string): Activity {
  const located = gitLocate(filePath);
  if (!located) return { git: false, commits: [], branches: [], history: [] };
  const { top, rel } = located;
  const head = git(top, ["rev-parse", "HEAD"])?.trim() ?? "";
  const stamp = `${head}|${statSync(filePath).mtimeMs}`;
  const key = `${top}|${rel}|${id}`;
  const hit = cache.get(key);
  if (hit && hit.stamp === stamp) return hit.value;

  const commits = parseCommits(
    git(top, ["log", "--all", "-F", `--grep=#${id}`, `--format=%h${SEP}%as${SEP}%s`, "-n", "30"])
  );
  const numberRe = new RegExp(`(^|[^0-9])${id}([^0-9]|$)`);
  const branches = (git(top, ["for-each-ref", "--format=%(refname:short)", "refs/heads", "refs/remotes"]) ?? "")
    .split("\n")
    .filter((b) => b && !b.endsWith("/HEAD") && numberRe.test(b));

  // The file's own commits, newest first; --follow tracks the archive move.
  const log = git(top, ["log", "--follow", `--format=${REC}%H${SEP}%h${SEP}%as${SEP}%s`, "--name-only", "-n", "40", "--", rel]) ?? "";
  const entries: (HistoryEntry & { full: string; path: string })[] = [];
  for (const record of log.split(REC).slice(1)) {
    const [header, ...rest] = record.split("\n");
    const [full, hash, date, subject] = header.split(SEP);
    const path = rest.map((l) => l.trim()).find(Boolean) ?? rel;
    const text = git(top, ["show", `${full}:${path}`]) ?? "";
    const status = text.match(/^status:\s*([a-z-]+)/m)?.[1];
    entries.push({ full, hash, date, subject, path, status });
  }
  const history: HistoryEntry[] = entries.map(({ hash, date, subject, status }, i) => {
    const older = entries[i + 1]?.status;
    const change = status && older && status !== older ? `${older} → ${status}` : !older && status ? `created as ${status}` : undefined;
    return { hash, date, subject, status, change };
  });
  const value: Activity = { git: true, commits, branches, history };
  cache.set(key, { stamp, value });
  return value;
}
