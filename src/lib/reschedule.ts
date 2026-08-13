/**
 * Suggesting a new time for an overdue task.
 *
 * Pure, like the rest of src/lib — the browser computes the suggestion so the
 * "Reschedule?" prompt can appear instantly without a round trip, and the
 * server uses the same function if it ever needs to.
 *
 * Nothing here moves a task. It only proposes. Nadi deliberately never
 * reschedules on its own: an overdue task is a signal that something was
 * missed, and quietly folding it into today would destroy exactly the
 * information the red badge exists to convey. The person decides; this only
 * saves them typing a date.
 */

import { nextDueDate, type Recurrence } from "./recurrence";

export type ReschedulableTask = {
  dueAt: string | Date | null;
  isAllDay: boolean;
  completedAt: string | Date | null;
  recurrence: Recurrence | null;
};

/** Only overdue, incomplete, dated tasks can be rescheduled. A task with no
 * deadline is never late, and a completed one needs no rescue. */
export function canReschedule(
  task: ReschedulableTask,
  now: Date = new Date(),
): boolean {
  if (task.completedAt || !task.dueAt) return false;
  return toDate(task.dueAt).getTime() < now.getTime();
}

/**
 * The proposed new deadline.
 *
 * Three cases, in order of how much the original said about intent:
 *
 * A repeating task already knows when it should next happen, so the
 * recurrence rule wins — rolled forward until it lands in the future, since a
 * daily task missed for a week would otherwise be "rescheduled" to six days
 * ago.
 *
 * A timed task carries a time of day that usually means something ("gym at
 * 7am"), so the hour is preserved and only the date moves. Suggesting a
 * generic "tomorrow morning" would throw away the one piece of scheduling the
 * person actually chose.
 *
 * An all-day task has no time to preserve, so it simply becomes today if
 * there is any of today left, and tomorrow otherwise.
 */
export function suggestNewDueDate(
  task: ReschedulableTask,
  now: Date = new Date(),
): Date {
  const original = toDate(task.dueAt!);

  if (task.recurrence) {
    let next = nextDueDate(task.recurrence, original);
    // A guard rather than a while(true): a malformed recurrence must not be
    // able to spin the browser's main thread forever.
    for (let i = 0; i < 400 && next.getTime() <= now.getTime(); i += 1) {
      next = nextDueDate(task.recurrence, next);
    }
    return next;
  }

  if (task.isAllDay) {
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 0, 0);
    if (endOfToday.getTime() > now.getTime()) return endOfToday;

    const endOfTomorrow = new Date(endOfToday);
    endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);
    return endOfTomorrow;
  }

  // Keep the hour and minute, move the date to the next day on which that
  // time is still ahead of us.
  const suggestion = new Date(now);
  suggestion.setHours(
    original.getHours(),
    original.getMinutes(),
    0,
    0,
  );

  if (suggestion.getTime() <= now.getTime()) {
    suggestion.setDate(suggestion.getDate() + 1);
  }

  return suggestion;
}

/** A short human label for the suggestion — "today at 7:00 am", "tomorrow at
 * 2:20 pm", "Mon 12 Aug". Written here rather than in the component so the
 * wording stays consistent wherever a suggestion is offered. */
export function describeSuggestion(
  date: Date,
  isAllDay: boolean,
  now: Date = new Date(),
): string {
  const time = isAllDay
    ? ""
    : date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  const dayLabel = relativeDayLabel(date, now);
  return time ? `${dayLabel} at ${time}` : dayLabel;
}

function relativeDayLabel(date: Date, now: Date): string {
  if (isSameDay(date, now)) return "today";

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameDay(date, tomorrow)) return "tomorrow";

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}
