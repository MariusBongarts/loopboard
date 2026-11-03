// Open decisions in a routine's run log (#0136, docs/routines.md "Run log"):
// what an unattended run couldn't settle, kept under `### Open decisions` in
// the run's `## YYYY-MM-DD` section. Pure — the server reads and writes the
// files, the board only shows what this returns.

export const DECISION_STATES = ['open', 'answered', 'applied', 'dropped'] as const;
export type DecisionState = (typeof DECISION_STATES)[number];
export const LIVE_STATES: readonly DecisionState[] = ['open', 'answered'];

export const DECISIONS_HEADING = 'Open decisions';
const SECTION_RE = /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?$/;
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*-\d{8}-\d+$/;
const DECISION_RE = /^####[ \t]+(\S+)[ \t]+·[ \t]+(.+?)[ \t]*$/;
const FIELD_RE = /^-[ \t]+([a-z-]+):[ \t]*(.*?)[ \t]*$/;
const OPTION_RE = /^[ \t]+-[ \t]+([A-Z]):[ \t]*(.*?)[ \t]*$/;

export interface DecisionOption {
  key: string;
  text: string;
}

export interface Decision {
  id: string;
  question: string;
  state: DecisionState;
  kind: string | null;
  raised: string | null;
  options: DecisionOption[];
  // The recommendation as written: `A — the reason`.
  recommended: string | null;
  interview: boolean;
  brief: string | null;
  answer: string | null;
  applied: string | null;
  dropped: string | null;
  section: string;
  line: number; // 1-based, its `####` heading
}

export interface LogProblem {
  line: number;
  message: string;
}

export interface LogSection {
  heading: string;
  line: number;
  decisions: Decision[];
}

export interface ParsedLog {
  sections: LogSection[];
  problems: LogProblem[];
}

const isState = (text: string): text is DecisionState => (DECISION_STATES as readonly string[]).includes(text);

// Lines that start a heading, outside code fences (a note's ```text block).
export function headingLines(lines: string[]): Set<number> {
  const out = new Set<number>();
  let fenced = false;
  lines.forEach((line, i) => {
    if (/^(```|~~~)/.test(line)) fenced = !fenced;
    else if (!fenced && /^#{1,6}[ \t]/.test(line)) out.add(i);
  });
  return out;
}

// The lines of the decision whose heading is at `start`, without trailing blanks.
export function blockEnd(lines: string[], start: number, headings: Set<number>): number {
  let end = start + 1;
  while (end < lines.length && !headings.has(end)) end++;
  while (end > start + 1 && !lines[end - 1].trim()) end--;
  return end;
}

function readBlock(lines: string[], start: number, section: string): { decision: Decision | null; problem: string | null } {
  const head = lines[start].match(DECISION_RE);
  if (!head) return { decision: null, problem: 'a decision heading is `#### <id> · <question>`' };
  const [, id, question] = head;
  const fields: Record<string, string> = {};
  const options: DecisionOption[] = [];
  const brief: string[] = [];
  let current: string | null = null;
  for (const line of lines.slice(start + 1)) {
    const field = line.match(FIELD_RE);
    const option = current === 'options' ? line.match(OPTION_RE) : null;
    if (field) {
      current = field[1];
      fields[current] = field[2];
    } else if (option) {
      options.push({ key: option[1], text: option[2] });
    } else if (/^[ \t]+\S/.test(line) && current) {
      const text = line.trim();
      if (current === 'options' && options.length) options[options.length - 1].text += ` ${text}`;
      else fields[current] = `${fields[current] ?? ''} ${text}`.trim();
    } else if (line.trim()) {
      current = null;
      brief.push(line.trim());
    }
  }
  const interview = fields.ask === 'interview';
  const state = fields.state ?? '';
  const problem = !ID_RE.test(id)
    ? `"${id}" is no decision id (<routine>-YYYYMMDD-<n>)`
    : !isState(state)
      ? `${id}: state is one of ${DECISION_STATES.join(', ')}`
      : state !== 'open' && !fields[state === 'answered' ? 'answer' : state]
        ? `${id}: ${state === 'dropped' ? 'a' : 'an'} ${state} decision needs \`- ${state === 'answered' ? 'answer' : state}:\``
        : !interview && (options.length < 2 || options.length > 4 || new Set(options.map((o) => o.key)).size !== options.length)
          ? `${id}: two to four lettered options, or \`ask: interview\` with a brief`
          : !interview && !fields.recommended
            ? `${id}: \`- recommended:\` names the option to pick and why`
            : null;
  if (problem || !isState(state)) return { decision: null, problem };
  return {
    decision: {
      id,
      question,
      state,
      kind: fields.kind || null,
      raised: fields.raised || null,
      options,
      recommended: fields.recommended || null,
      interview,
      brief: fields.brief || (brief.length ? brief.join(' ') : null),
      answer: fields.answer || null,
      applied: fields.applied || null,
      dropped: fields.dropped || null,
      section,
      line: start + 1,
    },
    problem: null,
  };
}

export function parseRunLog(text: string): ParsedLog {
  const lines = text.split(/\r?\n/);
  const headings = headingLines(lines);
  const sections: LogSection[] = [];
  const problems: LogProblem[] = [];
  let section: LogSection | null = null;
  let rejected = false;
  let sub = '';
  for (const i of [...headings].sort((a, b) => a - b)) {
    const line = lines[i];
    if (line.startsWith('## ')) {
      const heading = line.slice(3).trim();
      rejected = !SECTION_RE.test(heading);
      if (rejected) problems.push({ line: i + 1, message: `the section "${heading}" isn't \`## YYYY-MM-DD\`; its decisions are ignored` });
      section = { heading, line: i + 1, decisions: [] };
      sections.push(section);
      sub = '';
    } else if (line.startsWith('### ')) sub = line.slice(4).trim();
    else if (line.startsWith('#### ') && section && !rejected && sub === DECISIONS_HEADING) {
      const { decision, problem } = readBlock(lines.slice(0, blockEnd(lines, i, headings)), i, section.heading);
      if (problem) problems.push({ line: i + 1, message: problem });
      else if (decision && section.decisions.some((d) => d.id === decision.id)) problems.push({ line: i + 1, message: `${decision.id} appears twice in ${section.heading}` });
      else if (decision) section.decisions.push(decision);
    }
  }
  return { sections, problems };
}

export interface LoggedDecision extends Decision {
  file: string;
  // false when the newest section left it out: a run didn't carry it over.
  inNewest: boolean;
}

// The live decisions of one routine, from its logs newest first: an id's
// newest occurrence holds its state; `open` and `answered` are live. Oldest
// raised first, as the dispatcher asks them.
export function liveDecisions(logs: { file: string; parsed: ParsedLog }[]): LoggedDecision[] {
  const seen = new Map<string, LoggedDecision>();
  const newest = logs.find((l) => l.parsed.sections.length)?.parsed.sections[0] ?? null;
  for (const { file, parsed } of logs) {
    for (const section of parsed.sections) {
      for (const d of section.decisions) {
        if (!seen.has(d.id)) seen.set(d.id, { ...d, file, inNewest: section === newest });
      }
    }
  }
  return [...seen.values()].filter((d) => LIVE_STATES.includes(d.state)).sort(byRaised);
}

export function byRaised(a: Pick<Decision, 'raised' | 'id'>, b: Pick<Decision, 'raised' | 'id'>): number {
  return (a.raised ?? '').localeCompare(b.raised ?? '') || a.id.localeCompare(b.id, undefined, { numeric: true });
}

// The routine a decision id belongs to: its slug before `-YYYYMMDD-n`.
export function routineOf(id: string): string | null {
  return ID_RE.test(id) ? id.replace(/-\d{8}-\d+$/, '') : null;
}

export type DecisionChange = { answer: string } | { applied: string };

// A decision's block with its new state: `answered` + `- answer: A · day`,
// or `applied` + `- applied: day · what`.
export function changedBlock(block: string[], change: DecisionChange, day: string): string[] {
  const drop = 'answer' in change ? /^-[ \t]+(answer|applied):/ : /^-[ \t]+applied:/;
  const out = block.filter((l) => !drop.test(l));
  const stateAt = out.findIndex((l) => /^-[ \t]+state:/.test(l));
  const state = 'answer' in change ? 'answered' : 'applied';
  const line = 'answer' in change ? `- answer: ${change.answer} · ${day}` : `- applied: ${day} · ${change.applied}`;
  if (stateAt < 0) return [out[0], '', `- state: ${state}`, line, ...out.slice(1)];
  out[stateAt] = `- state: ${state}`;
  const after = 'applied' in change ? out.findIndex((l) => l.startsWith('- answer:')) : -1;
  out.splice((after >= 0 ? after : stateAt) + 1, 0, line);
  return out;
}

// One line, and an option's letter in capitals.
export function normalizeChoice(choice: string, options: DecisionOption[]): string {
  const text = choice.replace(/\s+/g, ' ').trim();
  const key = options.find((o) => o.key === text.toUpperCase());
  return key && text.length === 1 ? key.key : text;
}
