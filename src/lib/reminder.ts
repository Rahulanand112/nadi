/**
 * Reminder timing.
 *
 * Pure arithmetic — no Prisma, no Next, no React. Everything here is a
 * function of its arguments, which is what makes it testable and what lets
 * both the browser and the background job use the same rules.
 *
 * Two different kinds of "when" live here:
 *
 *   Tasks already know their moment. `dueAt` is a real instant, converted from
 *   the browser's local time before it ever reached the server, so a task
 *   reminder is nothing more than subtraction.
 *
 *   Habits do not. "Morning run" has no instant attached — it happens at 7am
 *   wherever the person is. Turning that into a real instant needs their
 *   timezone, and that is where the fiddly code below comes from.
 */

/** The offsets a person can pick. Adding one here is a UI change only: the
 * database stores plain minutes, so no migration is involved. */
export const REMINDER_OFFSETS = [
  { value: 10, label: "10 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 360, label: "6 hours before" },
  { value: 1440, label: "1 day before" },
] as const;

export type ReminderOffset = (typeof REMINDER_OFFSETS)[number]["value"];

export const DEFAULT_REMINDER_OFFSET_MINUTES = 30;

/** The largest offset anyone can choose. The sweep uses this to decide how far
 * ahead it needs to look, so the two can never drift apart. */
export const MAX_REMINDER_OFFSET_MINUTES = Math.max(
  ...REMINDER_OFFSETS.map((option) => option.value),
);

export function isReminderOffset(value: number): value is ReminderOffset {
  return REMINDER_OFFSETS.some((option) => option.value === value);
}

/** How long after its moment a reminder is still worth creating. If the app
 * were asleep for a week, we do not want to wake up and fire a week of stale
 * notifications at someone. */
export const REMINDER_GRACE_MS = 6 * 60 * 60 * 1000;

const MINUTE_MS = 60_000;

/** A task reminder is simply its deadline minus the chosen offset. */
export function reminderFireTime(dueAt: Date, offsetMinutes: number): Date {
  return new Date(dueAt.getTime() - offsetMinutes * MINUTE_MS);
}

/** True when a fire time has arrived but is not so old that firing it now
 * would be noise rather than a reminder. */
export function isDue(fireAt: Date, now: Date): boolean {
  const age = now.getTime() - fireAt.getTime();
  return age >= 0 && age <= REMINDER_GRACE_MS;
}

// ---------------------------------------------------------------------------
// Timezone conversion.
//
// Done with Intl rather than a date library on purpose: it is a handful of
// lines, it has no dependency to keep updated, and Node 20 ships the full
// timezone database, so named zones like "Asia/Kolkata" work everywhere this
// runs. Vercel's servers are on UTC and the database is in Singapore, so
// nothing may quietly assume the machine's own clock zone.
// ---------------------------------------------------------------------------

/** How far ahead of UTC a zone is at a given instant, in milliseconds.
 * Positive east of Greenwich: Asia/Kolkata returns +5.5 hours. */
export function timeZoneOffsetMs(timeZone: string, at: Date): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = formatter.formatToParts(at);
  const read = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  // Read the wall-clock reading in that zone, then pretend it was UTC. The
  // difference between that and the real instant is the offset.
  const asIfUtc = Date.UTC(
    read("year"),
    read("month") - 1,
    read("day"),
    // Some environments render midnight as hour 24 under hour12: false.
    read("hour") % 24,
    read("minute"),
    read("second"),
  );

  return asIfUtc - at.getTime();
}

/** The calendar day it currently is somewhere, as "2026-08-07".
 * en-CA is used because its date format is already ISO order. */
export function dayKeyInZone(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/**
 * Turns a wall-clock time in some zone into a real instant.
 * ("2026-08-07", 420, "Asia/Kolkata") is 7:00am in Chennai that day.
 *
 * Measured twice on purpose. The offset can only be looked up at an instant,
 * but the instant is the thing being solved for, so the first pass uses an
 * approximate one and the second corrects it. This only matters on the two
 * days a year a zone changes its clocks, but on those days a single pass can
 * be an hour wrong.
 */
export function zonedDayTimeToUtc(
  dayKey: string,
  minutesFromMidnight: number,
  timeZone: string,
): Date {
  const hours = Math.floor(minutesFromMidnight / 60);
  const minutes = minutesFromMidnight % 60;
  const wallClock = new Date(
    `${dayKey}T${pad(hours)}:${pad(minutes)}:00.000Z`,
  );

  const firstPass = new Date(
    wallClock.getTime() - timeZoneOffsetMs(timeZone, wallClock),
  );

  return new Date(wallClock.getTime() - timeZoneOffsetMs(timeZone, firstPass));
}

/** Whether a string is a timezone this runtime actually recognises. Guards
 * against a browser sending something unexpected. */
export function isValidTimeZone(value: string): boolean {
  if (!value || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Time-of-day helpers, for the habit form's <input type="time">.
// ---------------------------------------------------------------------------

/** 420 -> "07:00" */
export function minutesToTimeString(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/** "07:00" -> 420. Null when the string is not a valid time. */
export function timeStringToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
