import { describe, expect, it } from 'vitest';
import {
  describeSchedule,
  formatIso,
  nextOccurrence,
  occurrencesBetween,
  parseAt,
  parseCron,
  previousOccurrence,
  ScheduleError,
  zonedInstant,
  type Schedule,
} from '../shared/cron';

const cron = (expr: string): Schedule => ({ kind: 'cron', cron: parseCron(expr) });
const at = (text: string): Schedule => ({ kind: 'at', at: parseAt(text) });
const t = (iso: string) => Date.parse(iso);
const iso = (ms: number | null) => (ms === null ? null : new Date(ms).toISOString().replace('.000', ''));

describe('parsing (#0114)', () => {
  it.each([
    ['61 * * * *', 'minute "61" is out of range (0–59)'],
    ['* * *', 'a schedule has 5 fields (minute hour day-of-month month day-of-week), not 3'],
    ['* 5-1 * * *', 'hour range "5-1" runs backwards'],
    ['*/0 * * * *', 'minute step "0" must be a whole number of at least 1'],
    ['L * * * *', 'minute "L" is not a number'],
    ['0 0 32 * *', 'day of month "32" is out of range (1–31)'],
    ['0 0 * FOO *', 'month "FOO" is not a number'],
    ['@reboot', '"@reboot" is no schedule macro — use @hourly, @daily, @weekly, @monthly or @yearly'],
  ])('refuses %s with a reason', (expr, reason) => {
    expect(() => parseCron(expr)).toThrow(new ScheduleError(reason));
  });

  it('reads names, 7 as Sunday, steps from a start and L', () => {
    const c = parseCron('5/20 9-17/4 1,L jan-MAR 7,mon');
    expect(c.minutes).toEqual([5, 25, 45]);
    expect(c.hours).toEqual([9, 13, 17]);
    expect(c.days).toEqual([1]);
    expect(c.lastDay).toBe(true);
    expect(c.months).toEqual([1, 2, 3]);
    expect(c.weekdays).toEqual([0, 1]);
  });

  it('refuses an at that is no time or no day', () => {
    expect(() => parseAt('2026-11-03 9:00')).toThrow('write YYYY-MM-DD HH:MM');
    expect(() => parseAt('2026-02-30 09:00')).toThrow('no date and time that exists');
    expect(parseAt('2026-11-03T09:00')).toEqual({ year: 2026, month: 11, day: 3, hour: 9, minute: 0 });
  });
});

describe('next and previous occurrence (#0114)', () => {
  it('weekdays in UTC skip the weekend; previous includes the exact time', () => {
    expect(iso(nextOccurrence(cron('30 7 * * 1-5'), t('2026-10-30T08:00:00Z'), 'UTC'))).toBe('2026-11-02T07:30:00Z');
    expect(iso(previousOccurrence(cron('30 7 * * 1-5'), t('2026-10-31T12:00:00Z'), 'UTC'))).toBe('2026-10-30T07:30:00Z');
    expect(iso(previousOccurrence(cron('30 7 * * 1-5'), t('2026-10-30T07:30:00Z'), 'UTC'))).toBe('2026-10-30T07:30:00Z');
  });

  it('follows the local time in Berlin across summer and winter time', () => {
    expect(iso(nextOccurrence(cron('30 7 * * *'), t('2026-10-24T00:00:00Z'), 'Europe/Berlin'))).toBe('2026-10-24T05:30:00Z');
    expect(iso(nextOccurrence(cron('30 7 * * *'), t('2026-10-27T00:00:00Z'), 'Europe/Berlin'))).toBe('2026-10-27T06:30:00Z');
  });

  it('runs a time the clocks skip an hour later, once', () => {
    const s = cron('30 2 * * *');
    const first = nextOccurrence(s, t('2026-03-28T12:00:00Z'), 'Europe/Berlin');
    expect(iso(first)).toBe('2026-03-29T01:30:00Z'); // 03:30 CEST
    expect(iso(nextOccurrence(s, first!, 'Europe/Berlin'))).toBe('2026-03-30T00:30:00Z'); // 02:30 CEST
  });

  it('runs a time that happens twice once, the first time', () => {
    const s = cron('30 2 * * *');
    const first = nextOccurrence(s, t('2026-10-24T12:00:00Z'), 'Europe/Berlin');
    expect(iso(first)).toBe('2026-10-25T00:30:00Z'); // 02:30 CEST
    expect(iso(nextOccurrence(s, first!, 'Europe/Berlin'))).toBe('2026-10-26T01:30:00Z'); // 02:30 CET
  });

  it('gives an hourly routine 23 runs on the short day and 24 on the long one', () => {
    const hourly = cron('0 * * * *');
    const day = (from: string, to: string) => occurrencesBetween(hourly, t(from) - 1, t(to), 'Europe/Berlin').length;
    expect(day('2026-03-28T23:00:00Z', '2026-03-29T21:59:59Z')).toBe(23);
    expect(day('2026-10-24T22:00:00Z', '2026-10-25T22:59:59Z')).toBe(24);
  });

  it('follows New York across the end of summer time', () => {
    expect(iso(nextOccurrence(cron('0 9 * * *'), t('2026-10-31T00:00:00Z'), 'America/New_York'))).toBe('2026-10-31T13:00:00Z');
    expect(iso(nextOccurrence(cron('0 9 * * *'), t('2026-11-01T00:00:00Z'), 'America/New_York'))).toBe('2026-11-01T14:00:00Z');
  });

  it('handles half-hour offsets and a half-hour clock change', () => {
    expect(iso(nextOccurrence(cron('0 9 * * *'), t('2026-10-27T00:00:00Z'), 'Asia/Kolkata'))).toBe('2026-10-27T03:30:00Z');
    // Lord Howe skips 02:00–02:29 on 4 Oct 2026; 02:15 runs at 02:45 (+11:00).
    expect(iso(zonedInstant({ year: 2026, month: 10, day: 4, hour: 2, minute: 15 }, 'Australia/Lord_Howe'))).toBe('2026-10-03T15:45:00Z');
  });

  it('runs L on the last day of each month, February included', () => {
    expect(iso(nextOccurrence(cron('0 18 L * *'), t('2027-02-01T00:00:00Z'), 'UTC'))).toBe('2027-02-28T18:00:00Z');
    expect(iso(nextOccurrence(cron('0 18 L * *'), t('2028-02-01T00:00:00Z'), 'UTC'))).toBe('2028-02-29T18:00:00Z');
  });

  it('skips months without a 31st and finds the next 29 February', () => {
    expect(iso(nextOccurrence(cron('0 6 31 * *'), t('2026-04-01T00:00:00Z'), 'UTC'))).toBe('2026-05-31T06:00:00Z');
    expect(iso(nextOccurrence(cron('0 0 29 2 *'), t('2026-01-01T00:00:00Z'), 'UTC'))).toBe('2028-02-29T00:00:00Z');
    expect(nextOccurrence(cron('0 0 30 2 *'), t('2026-01-01T00:00:00Z'), 'UTC')).toBeNull();
  });

  it('ORs day of month and day of week unless one starts with *', () => {
    // The 1st (a Sunday) or any Monday.
    expect(iso(nextOccurrence(cron('0 9 1 * 1'), t('2026-10-27T00:00:00Z'), 'UTC'))).toBe('2026-11-01T09:00:00Z');
    // Odd days that are Mondays.
    expect(iso(nextOccurrence(cron('0 9 */2 * 1'), t('2026-10-27T00:00:00Z'), 'UTC'))).toBe('2026-11-09T09:00:00Z');
  });

  it('reads macros', () => {
    expect(iso(nextOccurrence(cron('@weekly'), t('2026-10-27T00:00:00Z'), 'UTC'))).toBe('2026-11-01T00:00:00Z');
    expect(iso(nextOccurrence(cron('@monthly'), t('2026-10-27T00:00:00Z'), 'UTC'))).toBe('2026-11-01T00:00:00Z');
  });

  it('places a one-time at in its zone, once', () => {
    const s = at('2026-11-03 09:00');
    expect(iso(nextOccurrence(s, t('2026-10-27T00:00:00Z'), 'Europe/Berlin'))).toBe('2026-11-03T08:00:00Z');
    expect(nextOccurrence(s, t('2026-11-03T08:00:00Z'), 'Europe/Berlin')).toBeNull();
    expect(iso(previousOccurrence(s, t('2026-11-04T00:00:00Z'), 'Europe/Berlin'))).toBe('2026-11-03T08:00:00Z');
  });
});

describe('formatting (#0114)', () => {
  it('writes ISO times with the zone offset', () => {
    expect(formatIso(t('2026-10-27T06:30:02Z'), 'Europe/Berlin')).toBe('2026-10-27T07:30:02+01:00');
    expect(formatIso(t('2026-10-27T13:00:00Z'), 'America/New_York')).toBe('2026-10-27T09:00:00-04:00');
    expect(formatIso(t('2026-10-27T03:30:00Z'), 'Asia/Kolkata')).toBe('2026-10-27T09:00:00+05:30');
  });

  it.each([
    ['30 7 * * 1-5', 'Weekdays at 07:30'],
    ['30 7 * * *', 'Every day at 07:30'],
    ['0 9 * * 1,4', 'Mondays and Thursdays at 09:00'],
    ['*/15 * * * *', 'Every 15 minutes'],
    ['*/15 * * * 1-5', 'Every 15 minutes on weekdays'],
    ['0 * * * *', 'Every hour'],
    ['5 * * * *', 'Every hour at :05'],
    ['0 */2 * * *', 'Every 2 hours'],
    ['0 6 1 * *', 'On the 1st of every month at 06:00'],
    ['0 18 L * *', 'On the last day of every month at 18:00'],
    ['0 6 1 1,4,7,10 *', 'On the 1st of Jan, Apr, Jul and Oct at 06:00'],
    ['0 6 2 1 *', 'Every year on 2 Jan at 06:00'],
    ['0 9,18 * * 0,6', 'Weekends at 09:00 and 18:00'],
    ['0 9 1-7 * 1', 'cron 0 9 1-7 * 1'],
  ])('describes %s as "%s"', (expr, words) => {
    expect(describeSchedule(cron(expr))).toBe(words);
  });

  it('describes a one-time routine', () => {
    expect(describeSchedule(at('2026-11-03 09:00'))).toBe('Once on 3 Nov 2026 at 09:00');
  });
});
