import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describeSchedule, formatLocal } from "../shared/cron";
import { splitFrontmatter } from "../shared/frontmatter";
import { shellWord } from "../shared/printable";
import { evaluate } from "./dispatch";
import { IDENTITY_FILE } from "./identity";
import { packageRoot } from "./paths";
import { harnessFor, machineName, type Routine } from "./routines";
import { lastRun, type Run } from "./runs";
import { workspaceNames, type Workspace } from "./workspaces";

// What a run's sub-agent gets (#0119, decision 7): the routine, the harness,
// the notes of the last three runs, the rules every run follows and the
// exact finish command.

// The identity file's paragraph that says what the harness is for.
function purpose(path: string): string | null {
  try {
    const body = splitFrontmatter(readFileSync(join(path, IDENTITY_FILE), "utf8")).body;
    const text = body.replace(/<!--[\s\S]*?-->/g, "").trim();
    return text.split(/\r?\n\s*\r?\n/)[0]?.trim() || null;
  } catch {
    return null;
  }
}

const OUTCOMES = ["ok", "failed", "aborted"];

function earlierNotes(routine: Routine): string[] {
  return routine.runs
    .filter((r) => OUTCOMES.includes(r.status))
    .slice(-3)
    .reverse()
    .map((r: Run) => {
      const note = r.note ? r.note.split("\n").join("\n  ") : "(no note)";
      return `- ${formatLocal(Date.parse(r.at), routine.timezone)} · ${r.status} — ${note}`;
    });
}

export function finishCommands(dir: string): string[] {
  const word = shellWord(dir);
  return [`loopboard routines finish ${word} --status ok --note "<your note>"`, `loopboard routines finish ${word} --status failed --note "<what went wrong>"`];
}

export function buildBrief(routine: Routine, registered: Workspace[], now = Date.now()): string {
  const harness = harnessFor(dirname(routine.root), routine.root);
  const open = lastRun(routine.runs);
  const running = open?.status === "running" ? open : null;
  const slot = running?.slot
    ? `this run is for the slot of ${formatLocal(Date.parse(running.slot), routine.timezone)}`
    : running
      ? "this is a manual run"
      : (() => {
          const ev = evaluate(routine, now);
          return ev.state === "due" && ev.slot !== null ? `its slot of ${formatLocal(ev.slot, routine.timezone)} is due` : "no run is open — `loopboard routines start` records one";
        })();
  const schedule = routine.parsed ? describeSchedule(routine.parsed) : "an invalid schedule";
  const lines: string[] = [
    `# Routine: ${routine.title}`,
    "",
    `You are running the routine "${routine.title}" (\`${routine.slug}\`) of the harness ${harness.name} (\`${harness.id}\`), unattended: a dispatcher started this run, and nobody is watching. Don't ask questions — decide, or stop and fail.`,
    "",
    `- Working directory: ${harness.path}`,
    `- Schedule: ${schedule} (${routine.timezone}); ${slot}.`,
    `- Started: ${formatLocal(running ? Date.parse(running.at) : now, routine.timezone)} on ${running?.host ?? machineName()}`,
    `- This routine's folder: ${routine.dir}`,
    "",
    "## The harness",
    "",
  ];
  const about = purpose(harness.path);
  if (about) lines.push(about, "");
  lines.push(`Read \`AGENTS.md\` in ${harness.path} first: its rules apply to this run.`, "");

  if (routine.creates) {
    lines.push(
      "## Steps",
      "",
      `This routine only files the period's issue, and loopboard does that itself — there is nothing for an agent to do. Run \`loopboard routines start ${shellWord(routine.dir)}\` instead.`,
      "",
    );
    return lines.join("\n");
  }

  lines.push("## Steps", "", routine.body.trim() || "(The routine has no steps. Finish with --status failed and say so.)", "");
  const notes = earlierNotes(routine);
  lines.push("## What earlier runs noted", "", ...(notes.length ? notes : ["This is the routine's first run."]), "");

  const others = routine.writesTo.map((id) => {
    const found = registered.find((w) => workspaceNames(w).includes(id));
    return found ? `\`${id}\` (${found.repoPath})` : `\`${id}\` (not registered on this machine)`;
  });
  lines.push(
    "## Rules for this run",
    "",
    others.length
      ? `1. Work in this harness, and write only to it and to ${others.join(", ")} — there, follow that harness's own AGENTS.md. Anything else that should change goes into your note as a suggestion.`
      : "1. Work in this harness and write only to it. Anything that should change elsewhere goes into your note as a suggestion.",
    "2. Never commit, push or publish. Leave your changes in the working tree; the maintainer commits when they choose.",
    "3. Never send anything — no email, chat message or post, no script that sends — unless a step above says so explicitly.",
    "4. Don't edit this routine's routine.md or runs.md; `finish` records the run.",
    "5. If a step can't be done, stop and finish with `--status failed`, saying why. Never fake a result.",
    "6. End with a short note, up to five sentences: what you did, what stands out, what the next run should know. Its first line is what Home shows for this run, so make it the one line that matters.",
    "",
    "## Finish",
    "",
    "When you're done, run exactly one of:",
    "",
    ...finishCommands(routine.dir).map((c) => `    ${c}`),
    "",
    `A note with quotes or several lines can come from stdin: \`printf '%s\\n' "…" | loopboard routines finish ${shellWord(routine.dir)} --status ok --note -\`.`,
    "",
  );
  return lines.join("\n");
}

// The dispatcher prompt (docs/dispatcher-prompt.md) for a harness or for
// every harness under a folder.
export function dispatcherPrompt(scope: { under: string } | { path: string }): string {
  const text = readFileSync(join(packageRoot(), "docs", "dispatcher-prompt.md"), "utf8");
  const [where, flag] =
    "under" in scope ? [`every harness under ${scope.under}`, `--under ${shellWord(scope.under)}`] : [`the harness at ${scope.path}`, shellWord(scope.path)];
  return text.replaceAll("{{WHERE}}", where).replaceAll("{{SCOPE}}", flag).trimEnd();
}
