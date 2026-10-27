import { addDays, graphStart, localDay, occurrencesBetween, scheduledOn, zonedParts, type LocalDate } from "../shared/cron";
import type { Routine } from "./routines";

// A routine's contribution graph (#0121, decision 14): 53 weeks of days in
// its zone, ending today. Red when a run failed or was aborted, else green
// when runs finished, else grey when a slot was missed or expired — recorded,
// or a past slot of an enabled routine since its created day (or first
// entry) without any entry, so a dispatcher that stopped shows.

export type DayState = "ok" | "failed" | "missed";

export interface GraphDay {
  date: string; // YYYY-MM-DD in the routine's zone
  state: DayState;
  ok: number;
  failed: number;
  missed: number;
  level: number; // 1–4 for ok days, relative to the busiest; 0 otherwise
}

function label(d: LocalDate): string {
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}

export function graphDays(routine: Routine, now: number): GraphDay[] {
  const zone = routine.timezone;
  const { year, month, day } = zonedParts(now, zone);
  const today = { year, month, day };
  const first = label(graphStart(today));
  const last = label(today);
  const counts = new Map<string, { ok: number; failed: number; missed: number }>();
  const bump = (date: string, key: "ok" | "failed" | "missed") => {
    if (date < first || date > last) return;
    const c = counts.get(date) ?? { ok: 0, failed: 0, missed: 0 };
    c[key]++;
    counts.set(date, c);
  };
  for (const run of routine.runs) {
    const date = localDay(Date.parse(run.at), zone);
    if (run.status === "ok") bump(date, "ok");
    else if (run.status === "failed" || run.status === "aborted") bump(date, "failed");
    else if (run.status === "expired") bump(localDay(Date.parse(run.slot ?? run.at), zone), "missed");
    else if (run.status === "missed" && run.from && run.to && routine.parsed) {
      for (const t of occurrencesBetween(routine.parsed, Date.parse(run.from) - 1, Date.parse(run.to), zone, 2000)) bump(localDay(t, zone), "missed");
    }
  }
  // Slots nothing was recorded for, before today.
  const since = routine.created ?? (routine.runs[0] ? localDay(Date.parse(routine.runs[0].at), zone) : null);
  if (routine.enabled && routine.parsed && since) {
    for (let d = graphStart(today); label(d) < last; d = addDays(d, 1)) {
      const date = label(d);
      if (date >= since && !counts.has(date) && scheduledOn(routine.parsed, d)) counts.set(date, { ok: 0, failed: 0, missed: 1 });
    }
  }
  const busiest = Math.max(1, ...[...counts.values()].map((c) => c.ok));
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, c]) => {
      const state: DayState = c.failed ? "failed" : c.ok ? "ok" : "missed";
      return { date, state, ...c, level: state === "ok" ? Math.max(1, Math.ceil((4 * c.ok) / busiest)) : 0 };
    });
}
