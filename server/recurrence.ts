import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { addDays, weekdayOf, zonedParts, type LocalDate } from "../shared/cron";
import { frontmatterInner, readField } from "../shared/frontmatter";
import { createIssue } from "./create";
import { nextId } from "./ids";
import { matchName } from "./names";
import { DAY_MS, parseDuration, type IssueSpec, type Period, type Routine } from "./routines";
import type { Assignee, Status } from "./issues";

// The period's issue of a `creates: issue` routine (#0118, supersedes #0090).
// `recurrence: <slug>@<period>` makes filing idempotent across live and
// archived issues; `check` reports two issues with the same value.

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function dayLabel(date: LocalDate): string {
  return `${date.year}-${pad(date.month)}-${pad(date.day)}`;
}

// ISO 8601 week: weeks start on Monday, week 1 holds the year's first Thursday.
export function isoWeek(date: LocalDate): { year: number; week: number } {
  const thursday = addDays(date, 3 - ((weekdayOf(date) + 6) % 7));
  const first = Date.UTC(thursday.year, 0, 1);
  const week = Math.floor((Date.UTC(thursday.year, thursday.month - 1, thursday.day) - first) / DAY_MS / 7) + 1;
  return { year: thursday.year, week };
}

export function periodLabel(period: Period, date: LocalDate): string {
  switch (period) {
    case "day":
      return dayLabel(date);
    case "week": {
      const { year, week } = isoWeek(date);
      return `${year}-W${pad(week)}`;
    }
    case "month":
      return `${date.year}-${pad(date.month)}`;
    case "quarter":
      return `${date.year}-Q${Math.ceil(date.month / 3)}`;
    case "year":
      return String(date.year);
  }
}

// The label of the period before the one `date` lies in.
export function previousLabel(period: Period, date: LocalDate): string {
  switch (period) {
    case "day":
      return periodLabel(period, addDays(date, -1));
    case "week":
      return periodLabel(period, addDays(date, -7));
    case "month":
      return periodLabel(period, date.month === 1 ? { year: date.year - 1, month: 12, day: 1 } : { ...date, month: date.month - 1, day: 1 });
    case "quarter": {
      const start = Math.floor((date.month - 1) / 3) * 3 + 1;
      return periodLabel(period, start === 1 ? { year: date.year - 1, month: 10, day: 1 } : { ...date, month: start - 3, day: 1 });
    }
    case "year":
      return String(date.year - 1);
  }
}

export interface PeriodFill {
  period: string;
  previous: string;
  date: string;
}

export function periodFill(period: Period, date: LocalDate): PeriodFill {
  return { period: periodLabel(period, date), previous: previousLabel(period, date), date: dayLabel(date) };
}

export function fillPattern(text: string, fill: PeriodFill): string {
  return text.replaceAll("{period}", fill.period).replaceAll("{previous}", fill.previous).replaceAll("{date}", fill.date);
}

export interface Recurring {
  value: string;
  file: string; // relative to the root, e.g. issues/_archive/0042-books.md
}

// Every issue that carries `recurrence:`, live and archived.
export function recurringIssues(root: string): Recurring[] {
  const out: Recurring[] = [];
  for (const dir of ["issues", "issues/_archive"]) {
    let names: string[];
    try {
      names = readdirSync(join(root, dir));
    } catch {
      continue;
    }
    for (const name of names.sort()) {
      if (!matchName("issue", name)) continue;
      let text: string;
      try {
        text = readFileSync(join(root, dir, name), "utf8");
      } catch {
        continue;
      }
      const value = readField(frontmatterInner(text.replace(/^﻿/, "")) ?? "", "recurrence");
      if (value) out.push({ value, file: `${dir}/${name}` });
    }
  }
  return out;
}

export function duplicateRecurrences(root: string): { value: string; files: string[] }[] {
  const byValue = new Map<string, string[]>();
  for (const r of recurringIssues(root)) byValue.set(r.value, [...(byValue.get(r.value) ?? []), r.file]);
  return [...byValue.entries()].filter(([, files]) => files.length > 1).map(([value, files]) => ({ value, files }));
}

export interface FiledIssue {
  id: string;
  file: string; // relative to the root
  title: string;
  period: string;
  recurrence: string;
  existing: boolean;
}

// Files the period's issue for `slot`, unless one carries its recurrence
// already. With `dryRun` it names the number it would take.
export async function fileIssue(routine: Routine, spec: IssueSpec, slot: number, now: number, dryRun = false): Promise<FiledIssue> {
  const { year, month, day } = zonedParts(slot, routine.timezone);
  const date = { year, month, day };
  const fill = periodFill(spec.period, date);
  const recurrence = `${routine.slug}@${fill.period}`;
  const title = fillPattern(spec.title, fill);
  const found = recurringIssues(routine.root).find((r) => r.value === recurrence);
  if (found) {
    return { id: found.file.match(/(\d{4})-/)?.[1] ?? "", file: found.file, title, period: fill.period, recurrence, existing: true };
  }
  const days = spec.dueAfter === null ? null : Math.round((parseDuration(spec.dueAfter) ?? 0) / DAY_MS);
  const due = days === null ? undefined : dayLabel(addDays(date, days));
  if (dryRun) return { id: nextId(routine.root, "issue"), file: "", title, period: fill.period, recurrence, existing: false };
  const today = zonedParts(now, routine.timezone);
  const created = await createIssue(
    routine.root,
    {
      title,
      category: spec.category,
      status: spec.status as Status,
      assignee: spec.assignee as Assignee,
      project: spec.project ?? undefined,
      labels: spec.labels,
      body: fillPattern(routine.body, fill),
      due,
      recurrence,
    },
    dayLabel(today),
  );
  return { id: created.id, file: `issues/${created.filename}`, title, period: fill.period, recurrence, existing: false };
}
