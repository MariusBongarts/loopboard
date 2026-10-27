import { existsSync, readFileSync } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { todayIso, writeFileAtomic, yamlScalar } from "./files";
import { nextId } from "./ids";
import { ALL_STATUSES, ASSIGNEES, type Assignee, type Status } from "./issues";
import { slugify } from "./workspaces";

// Create issues and projects from the root's own templates (#0019, #0020).

export class CreateError extends Error {
  readonly statusCode = 400;
}

export interface NewIssue {
  title: string;
  category: string;
  status?: Status;
  assignee?: Assignee;
  project?: string;
  labels?: string[];
  // A routine's issue (#0118): its own body, a due day and the period it stands for.
  body?: string;
  due?: string;
  recurrence?: string;
}

const FALLBACK_BODY: Record<string, string> = {
  task: "## What needs to change\n\n\n## Why\n\n\n## Acceptance criteria\n\n- [ ] \n",
  "user-story": "## User story\n\nAs a **…**, I want **…**, so that **…**.\n\n## Acceptance criteria\n\n- [ ] \n",
  bug: "## Steps to reproduce\n\n1. \n\n## Current\n\n\n## Expected\n\n\n## Acceptance criteria\n\n- [ ] \n",
};

function stripFrontmatter(text: string): string {
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").replace(/^\s+/, "");
}

// Quick-created issues (#0057) start from the template's headings and one
// empty checklist item per checklist section; the template's guidance prose
// stays in the template, so it never reads like real content.
export function skeletonBody(template: string): string {
  const sections: { heading: string; checklist: boolean }[] = [];
  for (const line of template.split(/\r?\n/)) {
    if (/^#{1,6}\s+\S/.test(line)) sections.push({ heading: line.trimEnd(), checklist: false });
    else if (/^\s*[-*] \[[ xX]\]/.test(line) && sections.length) sections[sections.length - 1].checklist = true;
  }
  return sections.map((sec) => (sec.checklist ? `${sec.heading}\n\n- [ ] \n` : `${sec.heading}\n`)).join("\n");
}

export function slugFor(title: string): string {
  return slugify(title).slice(0, 60).replace(/-+$/, "") || "untitled";
}

export async function createIssue(root: string, input: NewIssue, today = todayIso()): Promise<{ id: string; filename: string }> {
  const title = input.title.trim();
  if (!title) throw new CreateError("title is required");
  const category = input.category.trim() || "task";
  const status = input.status ?? "todo";
  const assignee = input.assignee ?? "agent";
  if (!(ALL_STATUSES as readonly string[]).includes(status)) throw new CreateError(`unknown status: ${status}`);
  if (!(ASSIGNEES as readonly string[]).includes(assignee)) throw new CreateError(`unknown assignee: ${assignee}`);
  if (input.project && !existsSync(join(root, "projects", input.project))) {
    throw new CreateError(`unknown project: ${input.project}`);
  }
  const template = join(root, "issues", "_templates", `${category}.md`);
  const body =
    input.body !== undefined
      ? `${input.body.trim()}\n`
      : skeletonBody(existsSync(template) ? stripFrontmatter(readFileSync(template, "utf8")) : FALLBACK_BODY[category] ?? FALLBACK_BODY.task);
  const id = nextId(root, "issue");
  const filename = `${id}-${slugFor(title)}.md`;
  const labels = (input.labels ?? []).map((l) => yamlScalar(l.trim())).filter(Boolean);
  const frontmatter = [
    "---",
    `id: ${id}`,
    `title: ${yamlScalar(title)}`,
    `category: ${category}`,
    `status: ${status}`,
    `assignee: ${assignee}`,
    ...(input.project ? [`project: ${input.project}`] : []),
    `labels: [${labels.join(", ")}]`,
    ...(input.due ? [`due: ${input.due}`] : []),
    ...(input.recurrence ? [`recurrence: ${input.recurrence}`] : []),
    `created: ${today}`,
    "---",
  ].join("\n");
  await mkdir(join(root, "issues"), { recursive: true });
  await writeFileAtomic(join(root, "issues", filename), `${frontmatter}\n\n${body}`);
  return { id, filename };
}

const FALLBACK_PRD = "# {Project Title} — PRD\n\n> Drafted: YYYY-MM-DD\n> Status: in-progress\n\n## Problem statement\n\n\n## Solution\n\n";
const FALLBACK_WIP = "# {Project Title} — WIP\n\n> Last updated: YYYY-MM-DD\n> PRD: [./prd.md](./prd.md)\n> Status: in-progress\n\n## Current focus\n\n\n## Activity log\n\n";

function fill(template: string, title: string, today: string): string {
  return template
    .replaceAll("{Project Title}", title)
    .replace(/YYYY-MM-DD/g, today)
    .replace(/^>\s*Status:.*$/m, "> Status: in-progress");
}

function replaceSection(md: string, heading: string, body: string): string {
  const re = new RegExp(`(^## ${heading}\\s*\\n)([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "m");
  return re.test(md) ? md.replace(re, `$1\n${body}\n\n`) : `${md.trimEnd()}\n\n## ${heading}\n\n${body}\n`;
}

export async function createProject(root: string, rawTitle: string, today = todayIso()): Promise<{ slug: string }> {
  const title = rawTitle.trim();
  if (!title) throw new CreateError("title is required");
  const projects = join(root, "projects");
  await mkdir(projects, { recursive: true });
  const slug = `${nextId(root, "project")}-${slugFor(title)}`;
  if ((await readdir(projects)).includes(slug)) throw new CreateError(`${slug} already exists`);
  const tpl = (name: string, fallback: string) => {
    const p = join(projects, "_templates", name);
    return existsSync(p) ? readFileSync(p, "utf8") : fallback;
  };
  const prd = fill(tpl("prd.md", FALLBACK_PRD), title, today);
  let wip = fill(tpl("wip.md", FALLBACK_WIP), title, today);
  wip = replaceSection(
    wip,
    "Current focus",
    `Kickoff — the PRD is still the template. Next: ask your agent to "write a PRD for ${title}" (grill-me first if the plan is fuzzy).`
  );
  wip = replaceSection(wip, "Activity log", `### ${today}\n\n- Project created in loopboard.`);
  await mkdir(join(projects, slug));
  await writeFileAtomic(join(projects, slug, "prd.md"), prd);
  await writeFileAtomic(join(projects, slug, "wip.md"), wip);
  return { slug };
}
