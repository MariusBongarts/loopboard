// A routine's run log, `runs.md` (#0114, #0116, ADR-0010): append-only, one
// entry per event, newest last. An entry is `## <local time> · <status>`,
// then `- key: value` lines, then the note as a block quote. The entries of
// one run share `started`; the last one is the run's state.

export const RUN_STATUSES = ["running", "ok", "failed", "aborted", "expired", "missed"] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

// The statuses of one run, tied together by `started`.
const RUN_STATES: readonly RunStatus[] = ["running", "ok", "failed", "aborted"];

export interface Run {
  status: RunStatus;
  // When it happened: `started` for a run, `recorded` for expired and missed.
  at: string;
  started?: string;
  finished?: string;
  slot?: string;
  host?: string;
  recorded?: string;
  from?: string;
  to?: string;
  slots?: number;
  note: string;
}

export interface RunsProblem {
  line: number;
  message: string;
}

export interface RunsLog {
  runs: Run[]; // oldest first
  problems: RunsProblem[];
}

const HEADING = /^##[ \t]+(.*?)[ \t]+·[ \t]+(\S+)[ \t]*$/;
const FIELD = /^-[ \t]+([a-z-]+):[ \t]*(.*?)[ \t]*$/;

function isStatus(text: string): text is RunStatus {
  return (RUN_STATUSES as readonly string[]).includes(text);
}

function validTime(value: string | undefined): boolean {
  return !!value && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:\d{2}|Z)$/.test(value) && !Number.isNaN(Date.parse(value));
}

// What an entry needs to be read: a time to order it by.
function entryProblem(status: RunStatus, fields: Record<string, string>): string | null {
  const key = RUN_STATES.includes(status) ? "started" : "recorded";
  if (!validTime(fields[key])) return `a ${status} entry needs \`${key}:\` as an ISO time`;
  for (const name of ["finished", "slot", "from", "to"]) {
    if (fields[name] !== undefined && !validTime(fields[name])) return `\`${name}:\` is no ISO time`;
  }
  if (fields.slots !== undefined && !/^\d+$/.test(fields.slots)) return "`slots:` is no number";
  return null;
}

export function parseRuns(text: string): RunsLog {
  const lines = text.split(/\r?\n/);
  const problems: RunsProblem[] = [];
  const byStart = new Map<string, number>();
  const runs: Run[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith("## ")) continue;
    const line = i + 1;
    const heading = lines[i].match(HEADING);
    const fields: Record<string, string> = {};
    let j = i + 1;
    for (; j < lines.length && FIELD.test(lines[j]); j++) {
      const [, key, value] = lines[j].match(FIELD) ?? [];
      fields[key] = value;
    }
    const note: string[] = [];
    for (; j < lines.length && !lines[j].startsWith("## "); j++) {
      if (lines[j].startsWith(">")) note.push(lines[j].replace(/^> ?/, ""));
      else if (lines[j].trim()) note.push(lines[j]);
    }
    i = j - 1;
    if (!heading || !isStatus(heading[2])) {
      problems.push({ line, message: heading ? `unknown status "${heading[2]}"` : "the heading isn't `## <time> · <status>`" });
      continue;
    }
    const status = heading[2];
    const problem = entryProblem(status, fields);
    if (problem) {
      problems.push({ line, message: problem });
      continue;
    }
    const run: Run = {
      status,
      at: RUN_STATES.includes(status) ? fields.started : fields.recorded,
      ...(fields.started !== undefined && { started: fields.started }),
      ...(fields.finished !== undefined && { finished: fields.finished }),
      ...(fields.slot !== undefined && { slot: fields.slot }),
      ...(fields.host !== undefined && { host: fields.host }),
      ...(fields.recorded !== undefined && { recorded: fields.recorded }),
      ...(fields.from !== undefined && { from: fields.from }),
      ...(fields.to !== undefined && { to: fields.to }),
      ...(fields.slots !== undefined && { slots: Number(fields.slots) }),
      note: note.join("\n").trim(),
    };
    const known = RUN_STATES.includes(status) ? byStart.get(fields.started) : undefined;
    if (known !== undefined) runs[known] = run;
    else {
      if (RUN_STATES.includes(status)) byStart.set(fields.started, runs.length);
      runs.push(run);
    }
  }
  const order = runs.map((run, index) => ({ run, index, time: Date.parse(run.at) }));
  order.sort((a, b) => a.time - b.time || a.index - b.index);
  return { runs: order.map((o) => o.run), problems };
}

// The newest entry that is a run (not an expired or missed slot).
export function lastRun(runs: Run[]): Run | null {
  for (let i = runs.length - 1; i >= 0; i--) if (RUN_STATES.includes(runs[i].status)) return runs[i];
  return null;
}
