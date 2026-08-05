/**
 * Pure calendar maths. No React, no dates library — a month grid is a solved
 * problem and a dependency here would cost more than it saves.
 *
 * Weeks start on Monday, which matches how most of the world reads a planner.
 */

export type CalendarDay = {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  key: string;
};

const MS_PER_DAY = 86_400_000;

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function dayKey(date: Date): string {
  // Local-date key, deliberately not toISOString(): a task due at 11pm IST
  // must land on today's cell, not tomorrow's in UTC.
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return dayKey(a) === dayKey(b);
}

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Monday-based start of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const copy = startOfDay(date);
  const weekday = (copy.getDay() + 6) % 7; // Monday = 0
  copy.setDate(copy.getDate() - weekday);
  return copy;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

export function addMonths(date: Date, months: number): Date {
  const copy = new Date(date);
  copy.setDate(1);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

/**
 * A month grid, always six rows. Fixed height stops the calendar jumping in
 * size as you page between a 28-day February and a 31-day March.
 */
export function buildMonthGrid(anchor: Date, today = new Date()): CalendarDay[] {
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(firstOfMonth);

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    return {
      date,
      isCurrentMonth: date.getMonth() === anchor.getMonth(),
      isToday: isSameDay(date, today),
      key: dayKey(date),
    };
  });
}

export function buildWeek(anchor: Date, today = new Date()): CalendarDay[] {
  const weekStart = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    return {
      date,
      isCurrentMonth: true,
      isToday: isSameDay(date, today),
      key: dayKey(date),
    };
  });
}

export function formatMonthTitle(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function formatWeekTitle(date: Date): string {
  const start = startOfWeek(date);
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();

  const startLabel = start.toLocaleDateString(undefined, {
    day: "numeric",
    ...(sameMonth ? {} : { month: "short" }),
  });
  const endLabel = end.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return `${startLabel} – ${endLabel}`;
}

/** Groups tasks by the local day they're due. Tasks with no deadline are
 * excluded — they don't belong anywhere on a calendar. */
export function groupByDay<T extends { dueAt: string | null }>(
  items: T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();

  for (const item of items) {
    if (!item.dueAt) continue;
    const key = dayKey(new Date(item.dueAt));
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }

  return map;
}
