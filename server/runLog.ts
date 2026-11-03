import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { liveDecisions, parseRunLog, type LoggedDecision, type LogProblem, type ParsedLog } from "../shared/decisions";

// A routine's run log (#0136): `<routine>/log/YYYY-MM.md`, one section per
// run, newest on top, written by the runs. Its open decisions are read here.

export const LOG_DIR = "log";
export type LogFile = `${typeof LOG_DIR}/${string}`;
const LOG_FILE_RE = /^\d{4}-\d{2}\.md$/;

// `log/2026-10.md`, newest month first.
export function logFiles(dir: string): LogFile[] {
  try {
    return readdirSync(join(dir, LOG_DIR))
      .filter((f) => LOG_FILE_RE.test(f))
      .sort()
      .reverse()
      .map((f): LogFile => `${LOG_DIR}/${f}`);
  } catch {
    return [];
  }
}

export function readLogs(dir: string): { file: LogFile; parsed: ParsedLog }[] {
  return logFiles(dir).map((file) => ({ file, parsed: parseRunLog(readFileSync(join(dir, file), "utf8")) }));
}

export interface FileProblem extends LogProblem {
  file: LogFile;
}

export function routineDecisions(dir: string): { decisions: LoggedDecision[]; problems: FileProblem[] } {
  const logs = readLogs(dir);
  return {
    decisions: liveDecisions(logs),
    problems: logs.flatMap(({ file, parsed }) => parsed.problems.map((p) => ({ ...p, file }))),
  };
}
