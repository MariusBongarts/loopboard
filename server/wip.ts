// Project digest for the Inbox (#0069): what a project is (PRD problem +
// solution), what it is doing now (first paragraph of WIP "Current focus"),
// and when it was worked on (dated activity-log entries). Plain text only —
// issue links collapse to `#NNNN` so the client can linkify them.

export interface ProjectSession {
  date: string;
  note: string;
}

export interface ProjectDigest {
  focus: string;
  problem: string;
  solution: string;
  lastSession?: string;
  sessions: ProjectSession[];
}

const DATE_HEADING_RE = /^###\s+(\d{4}-\d{2}-\d{2})\b.*$/gm;
const ISSUE_HREF_RE = /issues\/(?:_archive\/)?(\d{4})-/;

export function sectionBody(md: string, heading: string): string {
  const lines = md.split("\n");
  const want = heading.trim().toLowerCase();
  const start = lines.findIndex(
    (l) => /^##\s+/.test(l) && l.replace(/^##\s+/, "").trim().toLowerCase() === want
  );
  if (start === -1) return "";
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^##\s+/.test(l));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n");
}

export function firstParagraph(md: string): string {
  for (const block of md.trim().split(/\n\s*\n/)) {
    const b = block.trim();
    if (b && !b.startsWith("#")) return b;
  }
  return "";
}

export function toPlainText(md: string): string {
  return md
    .replace(/\[([^\]]*)\]\(([^)]*)\)/g, (_, text: string, href: string) => {
      const m = href.match(ISSUE_HREF_RE);
      if (!m) return text;
      return /^#?\d{4}$/.test(text.trim()) ? `#${m[1]}` : `${text} (#${m[1]})`;
    })
    .replace(/\*\*|__|`/g, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseSessions(activityLog: string): ProjectSession[] {
  const heads = [...activityLog.matchAll(DATE_HEADING_RE)];
  const byDate = new Map<string, string>();
  heads.forEach((h, i) => {
    const date = h[1];
    if (byDate.has(date)) return;
    const from = (h.index ?? 0) + h[0].length;
    const to = i + 1 < heads.length ? heads[i + 1].index : activityLog.length;
    const body = activityLog.slice(from, to).trim();
    const first = body.split(/\n(?=\s*[-*]\s)|\n\s*\n/)[0] ?? "";
    byDate.set(date, toPlainText(first));
  });
  return [...byDate.entries()]
    .map(([date, note]) => ({ date, note }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function parseProjectDigest(wipBody: string, prdBody: string): ProjectDigest {
  const activity = sectionBody(wipBody, "Activity log");
  const sessions = parseSessions(activity || wipBody);
  const lastUpdated = wipBody.match(/^>\s*Last updated:\s*(\d{4}-\d{2}-\d{2})/m)?.[1];
  return {
    focus: toPlainText(firstParagraph(sectionBody(wipBody, "Current focus"))),
    problem: toPlainText(firstParagraph(sectionBody(prdBody, "Problem statement"))),
    solution: toPlainText(firstParagraph(sectionBody(prdBody, "Solution"))),
    lastSession: sessions[0]?.date ?? lastUpdated,
    sessions,
  };
}
