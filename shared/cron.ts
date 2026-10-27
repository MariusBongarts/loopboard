// Routine schedules (#0114, ADR-0010): five-field cron or a one-time `at`,
// in an IANA time zone. Shared by the server, the CLI and the client.
// Daylight saving: a local time the clocks skip runs at the same minute an
// hour later; a local time that happens twice runs once, the first time.

export interface Cron {
  source: string;
  minutes: number[];
  hours: number[];
  days: number[];
  months: number[];
  weekdays: number[]; // 0 = Sunday
  lastDay: boolean; // `L` in the day of month
  // A field starting with `*` (as in cron): day of month and day of week are
  // ORed only when neither does.
  dayStar: boolean;
  weekdayStar: boolean;
}

export interface LocalTime {
  year: number;
  month: number; // 1–12
  day: number;
  hour: number;
  minute: number;
}

export type Schedule = { kind: 'cron'; cron: Cron } | { kind: 'at'; at: LocalTime };

export class ScheduleError extends Error {}

const MACROS: Record<string, string> = {
  '@hourly': '0 * * * *',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@weekly': '0 0 * * 0',
  '@monthly': '0 0 1 * *',
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
};

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WEEKDAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

interface FieldSpec {
  name: string;
  min: number;
  max: number;
  names?: string[];
  nameBase?: number;
}

const FIELDS: FieldSpec[] = [
  { name: 'minute', min: 0, max: 59 },
  { name: 'hour', min: 0, max: 23 },
  { name: 'day of month', min: 1, max: 31 },
  { name: 'month', min: 1, max: 12, names: MONTH_NAMES, nameBase: 1 },
  { name: 'day of week', min: 0, max: 7, names: WEEKDAY_NAMES, nameBase: 0 },
];

function fieldValue(spec: FieldSpec, text: string): number {
  const named = spec.names?.indexOf(text.toUpperCase()) ?? -1;
  if (named >= 0) return named + (spec.nameBase ?? 0);
  if (!/^\d+$/.test(text)) throw new ScheduleError(`${spec.name} "${text}" is not a number`);
  const n = Number(text);
  if (n < spec.min || n > spec.max) throw new ScheduleError(`${spec.name} "${text}" is out of range (${spec.min}–${spec.max})`);
  return n;
}

function parseField(spec: FieldSpec, text: string, allowLast: boolean): { values: number[]; last: boolean } {
  const values = new Set<number>();
  let last = false;
  for (const item of text.split(',')) {
    if (allowLast && item.toUpperCase() === 'L') {
      last = true;
      continue;
    }
    const [range, stepText, extra] = item.split('/');
    if (extra !== undefined || range === '') throw new ScheduleError(`${spec.name} "${item}" doesn't read as cron`);
    let step = 1;
    if (stepText !== undefined) {
      if (!/^\d+$/.test(stepText) || Number(stepText) < 1) throw new ScheduleError(`${spec.name} step "${stepText}" must be a whole number of at least 1`);
      step = Number(stepText);
    }
    let from: number;
    let to: number;
    if (range === '*') {
      [from, to] = [spec.min, spec.max];
    } else if (range.includes('-')) {
      const [a, b, more] = range.split('-');
      if (more !== undefined || !a || !b) throw new ScheduleError(`${spec.name} "${item}" doesn't read as cron`);
      [from, to] = [fieldValue(spec, a), fieldValue(spec, b)];
      if (from > to) throw new ScheduleError(`${spec.name} range "${range}" runs backwards`);
    } else {
      from = fieldValue(spec, range);
      // `5/15` counts from 5 to the end, as in cron.
      to = stepText !== undefined ? spec.max : from;
    }
    for (let v = from; v <= to; v += step) values.add(v);
  }
  return { values: [...values].sort((a, b) => a - b), last };
}

export function parseCron(expression: string): Cron {
  const source = expression.trim();
  const text = source.startsWith('@') ? MACROS[source.toLowerCase()] : source;
  if (!text) throw new ScheduleError(`"${source}" is no schedule macro — use @hourly, @daily, @weekly, @monthly or @yearly`);
  const parts = text.split(/\s+/);
  if (parts.length !== 5) throw new ScheduleError(`a schedule has 5 fields (minute hour day-of-month month day-of-week), not ${parts.length}`);
  const [minute, hour, day, month, weekday] = parts.map((part, i) => parseField(FIELDS[i], part, i === 2));
  return {
    source,
    minutes: minute.values,
    hours: hour.values,
    days: day.values,
    months: month.values,
    weekdays: [...new Set(weekday.values.map((d) => d % 7))].sort((a, b) => a - b),
    lastDay: day.last,
    dayStar: parts[2].startsWith('*'),
    weekdayStar: parts[4].startsWith('*'),
  };
}

const AT_RE = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/;

export function parseAt(text: string): LocalTime {
  const m = text.trim().match(AT_RE);
  if (!m) throw new ScheduleError(`"${text}" is no time — write YYYY-MM-DD HH:MM`);
  const [year, month, day, hour, minute] = m.slice(1).map(Number);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month) || hour > 23 || minute > 59) {
    throw new ScheduleError(`"${text}" is no date and time that exists`);
  }
  return { year, month, day, hour, minute };
}

// ── Time zones ───────────────────────────────────────────────────────

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(zone: string): Intl.DateTimeFormat {
  let f = formatters.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formatters.set(zone, f);
  }
  return f;
}

export function isTimeZone(zone: string): boolean {
  try {
    formatter(zone);
    return true;
  } catch {
    return false;
  }
}

export function systemTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export interface ZonedParts extends LocalTime {
  second: number;
  weekday: number;
}

export function zonedParts(instant: number, zone: string): ZonedParts {
  const out: Record<string, number> = {};
  for (const p of formatter(zone).formatToParts(new Date(instant))) {
    if (p.type !== 'literal') out[p.type] = Number(p.value);
  }
  const { year, month, day, minute, second } = out;
  const hour = out.hour % 24;
  return { year, month, day, hour, minute, second, weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay() };
}

// Milliseconds the zone is ahead of UTC at `instant`.
function offsetAt(instant: number, zone: string): number {
  const p = zonedParts(instant, zone);
  const whole = instant - (((instant % 1000) + 1000) % 1000);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - whole;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function sameWall(instant: number, local: LocalTime, zone: string): boolean {
  const p = zonedParts(instant, zone);
  return p.year === local.year && p.month === local.month && p.day === local.day && p.hour === local.hour && p.minute === local.minute;
}

// The instant of a local wall time, by the DST rules above.
export function zonedInstant(local: LocalTime, zone: string): number {
  const wall = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
  const before = offsetAt(wall - 14 * HOUR, zone);
  const after = offsetAt(wall + 14 * HOUR, zone);
  const fits = [...new Set([before, after])].map((o) => wall - o).filter((t) => sameWall(t, local, zone));
  return fits.length ? Math.min(...fits) : wall - before;
}

function pad(n: number, width = 2): string {
  return String(Math.abs(n)).padStart(width, '0');
}

// `2026-10-27T07:30:02+01:00` — ISO 8601 with the zone's offset, to the second.
export function formatIso(instant: number, zone: string): string {
  const p = zonedParts(instant, zone);
  const offset = Math.round(offsetAt(instant, zone) / 60000);
  const sign = offset < 0 ? '-' : '+';
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}${sign}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;
}

// `2026-10-27 07:30` in the zone.
export function formatLocal(instant: number, zone: string): string {
  const p = zonedParts(instant, zone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}`;
}

// The local day `YYYY-MM-DD` of an instant in the zone.
export function localDay(instant: number, zone: string): string {
  return formatLocal(instant, zone).slice(0, 10);
}

// ── Calendar ─────────────────────────────────────────────────────────

export interface LocalDate {
  year: number;
  month: number;
  day: number;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addDays(date: LocalDate, n: number): LocalDate {
  const d = new Date(Date.UTC(date.year, date.month - 1, date.day + n));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function weekdayOf(date: LocalDate): number {
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
}

function dayMatches(cron: Cron, date: LocalDate): boolean {
  if (!cron.months.includes(date.month)) return false;
  const byDay = cron.days.includes(date.day) || (cron.lastDay && date.day === daysInMonth(date.year, date.month));
  const byWeekday = cron.weekdays.includes(weekdayOf(date));
  return cron.dayStar || cron.weekdayStar ? byDay && byWeekday : byDay || byWeekday;
}

// Every occurrence on a local day, ascending, each once.
function instantsOn(cron: Cron, date: LocalDate, zone: string): number[] {
  const start = Date.UTC(date.year, date.month - 1, date.day);
  const steady = offsetAt(start - 14 * HOUR, zone) === offsetAt(start + DAY + 14 * HOUR, zone);
  const offset = steady ? offsetAt(start, zone) : 0;
  const out = new Set<number>();
  for (const hour of cron.hours) {
    for (const minute of cron.minutes) {
      out.add(steady ? start + hour * HOUR + minute * 60000 - offset : zonedInstant({ ...date, hour, minute }, zone));
    }
  }
  return [...out].sort((a, b) => a - b);
}

// 29 February can be eight years away (2096 → 2104).
const SEARCH_DAYS = 366 * 8 + 2;

function dateOf(instant: number, zone: string): LocalDate {
  const { year, month, day } = zonedParts(instant, zone);
  return { year, month, day };
}

export function nextOccurrence(schedule: Schedule, after: number, zone: string): number | null {
  if (schedule.kind === 'at') {
    const t = zonedInstant(schedule.at, zone);
    return t > after ? t : null;
  }
  // From the day before: a skipped time just before midnight moves past it.
  let date = addDays(dateOf(after, zone), -1);
  for (let i = 0; i < SEARCH_DAYS; i++, date = addDays(date, 1)) {
    if (!dayMatches(schedule.cron, date)) continue;
    const hit = instantsOn(schedule.cron, date, zone).find((t) => t > after);
    if (hit !== undefined) return hit;
  }
  return null;
}

export function previousOccurrence(schedule: Schedule, atOrBefore: number, zone: string): number | null {
  if (schedule.kind === 'at') {
    const t = zonedInstant(schedule.at, zone);
    return t <= atOrBefore ? t : null;
  }
  let date = addDays(dateOf(atOrBefore, zone), 1);
  for (let i = 0; i < SEARCH_DAYS; i++, date = addDays(date, -1)) {
    if (!dayMatches(schedule.cron, date)) continue;
    const hits = instantsOn(schedule.cron, date, zone).filter((t) => t <= atOrBefore);
    if (hits.length) return hits[hits.length - 1];
  }
  return null;
}

// Occurrences after `from` up to and including `to`, at most `limit`.
export function occurrencesBetween(schedule: Schedule, from: number, to: number, zone: string, limit = 10_000): number[] {
  const out: number[] = [];
  for (let t = nextOccurrence(schedule, from, zone); t !== null && t <= to && out.length < limit; t = nextOccurrence(schedule, t, zone)) {
    out.push(t);
  }
  return out;
}

// Whether a local day holds an occurrence (the graph's "something scheduled").
export function scheduledOn(schedule: Schedule, date: LocalDate): boolean {
  if (schedule.kind === 'at') return schedule.at.year === date.year && schedule.at.month === date.month && schedule.at.day === date.day;
  return dayMatches(schedule.cron, date);
}

// ── In words ─────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];

function list(items: string[]): string {
  return items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function ordinal(n: number): string {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${suffix}`;
}

function isFull(values: number[], min: number, max: number): boolean {
  return values.length === max - min + 1;
}

// `every n` when the values are min, min+n, … through the range.
function stepOf(values: number[], min: number, max: number): number | null {
  if (values.length < 2 || values[0] !== min) return null;
  const step = values[1] - values[0];
  const even = values.every((v, i) => v === min + i * step);
  return even && values[values.length - 1] + step > max ? step : null;
}

function timeOfDay(hour: number, minute: number): string {
  return `${pad(hour)}:${pad(minute)}`;
}

function timesPart(cron: Cron): string | null {
  const { minutes, hours } = cron;
  const everyHour = isFull(hours, 0, 23);
  if (everyHour && isFull(minutes, 0, 59)) return 'every minute';
  const minuteStep = stepOf(minutes, 0, 59);
  if (everyHour && minuteStep) return `every ${minuteStep} minutes`;
  if (everyHour && minutes.length === 1) return minutes[0] === 0 ? 'every hour' : `every hour at :${pad(minutes[0])}`;
  const hourStep = stepOf(hours, 0, 23);
  if (hourStep && minutes.length === 1) return `every ${hourStep} hours${minutes[0] ? ` at :${pad(minutes[0])}` : ''}`;
  if (hours.length * minutes.length <= 4) {
    return `at ${list(hours.flatMap((h) => minutes.map((m) => timeOfDay(h, m))))}`;
  }
  return null;
}

function daysPart(cron: Cron): string | null {
  const allMonths = isFull(cron.months, 1, 12);
  const anyDay = cron.dayStar && isFull(cron.days, 1, 31) && !cron.lastDay;
  const anyWeekday = cron.weekdayStar && cron.weekdays.length === 7;
  const months = allMonths ? 'every month' : list(cron.months.map((m) => MONTHS[m - 1]));
  if (anyDay && anyWeekday) return allMonths ? 'every day' : `every day in ${months}`;
  if (anyDay && !cron.weekdayStar) {
    const w = cron.weekdays.join(',');
    const days = w === '1,2,3,4,5' ? 'weekdays' : w === '0,6' ? 'weekends' : list(cron.weekdays.map((d) => WEEKDAYS[d]));
    return allMonths ? days : `${days} in ${months}`;
  }
  if (anyWeekday && !cron.dayStar) {
    const days = [...cron.days.map(ordinal), ...(cron.lastDay ? ['last day'] : [])];
    if (!allMonths && cron.months.length === 1 && cron.days.length === 1 && !cron.lastDay) return `every year on ${cron.days[0]} ${months}`;
    return `on the ${list(days)} of ${months}`;
  }
  return null;
}

const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// `today 15:00`, `tomorrow 07:30`, `Mon 2 Nov 07:30`, `Tue 2 Nov 2027 07:30`.
export function formatWhen(instant: number, zone: string, now: number): string {
  const p = zonedParts(instant, zone);
  const today = dateOf(now, zone);
  const days = Math.round((Date.UTC(p.year, p.month - 1, p.day) - Date.UTC(today.year, today.month - 1, today.day)) / DAY);
  const time = timeOfDay(p.hour, p.minute);
  if (days === 0) return `today ${time}`;
  if (days === 1) return `tomorrow ${time}`;
  if (days === -1) return `yesterday ${time}`;
  return `${SHORT_WEEKDAYS[p.weekday]} ${p.day} ${MONTHS[p.month - 1]}${p.year === today.year ? '' : ` ${p.year}`} ${time}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function describeSchedule(schedule: Schedule): string {
  if (schedule.kind === 'at') {
    const { year, month, day, hour, minute } = schedule.at;
    return `Once on ${day} ${MONTHS[month - 1]} ${year} at ${timeOfDay(hour, minute)}`;
  }
  const cron = schedule.cron;
  const times = timesPart(cron);
  const days = daysPart(cron);
  if (!times || !days) return `cron ${cron.source}`;
  if (times.startsWith('at ')) return capitalize(`${days} ${times}`);
  if (days.startsWith('every day')) return capitalize(`${times}${days.slice('every day'.length)}`);
  return capitalize(days.startsWith('on ') || days.startsWith('every ') ? `${times} ${days}` : `${times} on ${days}`);
}
