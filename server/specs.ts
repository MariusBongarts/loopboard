import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { DEFAULT_BASE_PATH, resolveBaseDir } from "./issues";

function getSpecsDir(basePath: string) {
  return join(resolveBaseDir(basePath), "specs");
}

export type ScenarioStatus = "covered" | "partial" | "fixme" | "none";

export const SCENARIO_STATUSES: readonly ScenarioStatus[] = [
  "covered",
  "partial",
  "fixme",
  "none",
] as const;

export interface Scenario {
  title: string;
  status: ScenarioStatus;
  notes: string;
  body: string;
}

export interface Spec {
  id: string;
  filename: string;
  title: string;
  preamble: string;
  scenarios: Scenario[];
  hasTable: boolean;
}

const FILENAME_RE = /^(\d{2})-[a-z0-9-]+\.md$/;

const EMOJI_TO_STATUS: Record<string, ScenarioStatus> = {
  "✅": "covered",
  "🟡": "partial",
  "⏳": "fixme",
  "❌": "none",
};

function emojiToStatus(cell: string): ScenarioStatus | null {
  for (const key of Object.keys(EMOJI_TO_STATUS)) {
    if (cell.includes(key)) return EMOJI_TO_STATUS[key];
  }
  return null;
}

function splitTableRow(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return [];
  const inner = trimmed.slice(1, -1);
  return inner.split("|").map((c) => c.trim());
}

function isAlignmentRow(cells: string[]): boolean {
  return cells.every((c) => /^:?-+:?$/.test(c));
}

interface CoverageRow {
  scenarioTitle: string;
  status: ScenarioStatus;
  notes: string;
}

function parseCoverageTable(block: string): CoverageRow[] {
  const lines = block.split("\n");
  const rows: CoverageRow[] = [];
  let inTable = false;
  let sawAlignmentRow = false;
  for (const line of lines) {
    const cells = splitTableRow(line);
    if (cells.length === 0) {
      if (inTable) break;
      continue;
    }
    if (!inTable) {
      inTable = true;
      sawAlignmentRow = false;
      continue;
    }
    if (!sawAlignmentRow) {
      if (isAlignmentRow(cells)) {
        sawAlignmentRow = true;
        continue;
      }
      sawAlignmentRow = true;
    }
    if (cells.length < 2) continue;
    const status = emojiToStatus(cells[1]);
    if (!status) continue;
    rows.push({
      scenarioTitle: cells[0],
      status,
      notes: cells[2] ?? "",
    });
  }
  return rows;
}

interface Section {
  start: number;
  end: number;
  text: string;
}

function findCoverageBlock(body: string): Section | null {
  const lines = body.split("\n");
  let h2Start = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (h2Start === -1) {
      if (/^##\s+E2E coverage\s*$/i.test(line)) {
        h2Start = i;
      }
      continue;
    }
    if (/^##\s+\S/.test(line)) {
      return {
        start: h2Start,
        end: i,
        text: lines.slice(h2Start + 1, i).join("\n"),
      };
    }
  }
  if (h2Start !== -1) {
    return {
      start: h2Start,
      end: lines.length,
      text: lines.slice(h2Start + 1).join("\n"),
    };
  }
  return null;
}

interface ScenarioBlock {
  title: string;
  body: string;
}

function findScenarioBlocks(body: string): {
  preambleEndLine: number;
  scenarios: ScenarioBlock[];
} {
  const lines = body.split("\n");
  const scenarios: ScenarioBlock[] = [];
  let preambleEndLine = lines.length;
  let cursorTitle: string | null = null;
  let cursorStart = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^###\s+Scenario:\s*(.+?)\s*$/);
    if (m) {
      if (cursorTitle !== null) {
        scenarios.push({
          title: cursorTitle,
          body: lines
            .slice(cursorStart + 1, i)
            .join("\n")
            .trim(),
        });
      } else {
        preambleEndLine = i;
      }
      cursorTitle = m[1].trim();
      cursorStart = i;
    }
  }
  if (cursorTitle !== null) {
    scenarios.push({
      title: cursorTitle,
      body: lines
        .slice(cursorStart + 1)
        .join("\n")
        .trim(),
    });
  }
  return { preambleEndLine, scenarios };
}

function buildPreamble(
  body: string,
  preambleEndLine: number,
  coverageBlock: Section | null
): string {
  const lines = body.split("\n").slice(0, preambleEndLine);
  if (!coverageBlock) return lines.join("\n").trim();
  const before = lines.slice(0, coverageBlock.start);
  const after = lines.slice(coverageBlock.end);
  const joined = [...before, ...after].join("\n").trim();
  return joined;
}

function extractH1Title(body: string, fallback: string): string {
  const m = body.match(/^#\s+(.+?)\s*$/m);
  return m ? m[1].trim() : fallback;
}

export async function readAllSpecs(basePath = DEFAULT_BASE_PATH): Promise<Spec[]> {
  const specsDir = getSpecsDir(basePath);
  let entries: string[];
  try {
    entries = await readdir(specsDir);
  } catch {
    return [];
  }
  const specs: Spec[] = [];
  for (const entry of entries) {
    const m = entry.match(FILENAME_RE);
    if (!m) continue;
    const id = m[1];
    const full = join(specsDir, entry);
    let s;
    try {
      s = await stat(full);
    } catch {
      continue;
    }
    if (!s.isFile()) continue;
    let raw: string;
    try {
      raw = await readFile(full, "utf8");
    } catch {
      continue;
    }
    const spec = parseSpec(id, entry, raw);
    specs.push(spec);
  }
  return specs.sort((a, b) => a.id.localeCompare(b.id));
}

export function parseSpec(id: string, filename: string, raw: string): Spec {
  const title = extractH1Title(raw, filename);
  const coverageBlock = findCoverageBlock(raw);
  const tableRows = coverageBlock ? parseCoverageTable(coverageBlock.text) : [];
  const tableMap = new Map<string, { status: ScenarioStatus; notes: string }>();
  for (const r of tableRows) {
    tableMap.set(r.scenarioTitle, { status: r.status, notes: r.notes });
  }
  const { preambleEndLine, scenarios: blocks } = findScenarioBlocks(raw);
  const scenarios: Scenario[] = blocks.map((b) => {
    const hit = tableMap.get(b.title);
    return {
      title: b.title,
      status: hit?.status ?? "none",
      notes: hit?.notes ?? "",
      body: b.body,
    };
  });
  const preamble = buildPreamble(raw, preambleEndLine, coverageBlock);
  return {
    id,
    filename,
    title,
    preamble,
    scenarios,
    hasTable: coverageBlock !== null,
  };
}

export interface CoverageCounts {
  covered: number;
  partial: number;
  fixme: number;
  none: number;
}

export interface CoverageStats {
  total: number;
  weighted: number;
  counts: CoverageCounts;
}

export function emptyCoverageCounts(): CoverageCounts {
  return { covered: 0, partial: 0, fixme: 0, none: 0 };
}

export function specCoverage(spec: Spec): CoverageStats {
  const counts = emptyCoverageCounts();
  for (const sc of spec.scenarios) counts[sc.status]++;
  const total = spec.scenarios.length;
  const weighted = counts.covered + 0.5 * counts.partial;
  return { total, weighted, counts };
}

export function aggregateCoverage(specs: Spec[]): CoverageStats {
  const counts = emptyCoverageCounts();
  let total = 0;
  for (const spec of specs) {
    for (const sc of spec.scenarios) {
      counts[sc.status]++;
      total++;
    }
  }
  const weighted = counts.covered + 0.5 * counts.partial;
  return { total, weighted, counts };
}
