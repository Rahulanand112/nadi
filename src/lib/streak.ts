/**
 * Streak maths over a set of completed days.
 *
 * Days are compared as local calendar dates ("2026-08-05"), never as
 * timestamps. A habit done at 11pm and one done at 6am are a day apart to the
 * person doing them, regardless of what UTC thinks.
 */

export function toDayKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function shiftDay(key: string, offset: number): string {
  const date = new Date(`${key}T00:00:00`);
  date.setDate(date.getDate() + offset);
  return toDayKey(date);
}

/**
 * Days completed in an unbroken run ending today or yesterday.
 *
 * Yesterday counts as still alive on purpose: at 9am, someone who did their
 * habit every day for a month but hasn't done today's yet has a streak of 30,
 * not 0. Breaking it at midnight would be technically defensible and
 * emotionally wrong — and the whole point of a streak is how it feels.
 */
export function currentStreak(completedDays: Set<string>, today = new Date()): number {
  const todayKey = toDayKey(today);
  const yesterdayKey = shiftDay(todayKey, -1);

  let cursor: string;
  if (completedDays.has(todayKey)) cursor = todayKey;
  else if (completedDays.has(yesterdayKey)) cursor = yesterdayKey;
  else return 0;

  let streak = 0;
  while (completedDays.has(cursor)) {
    streak += 1;
    cursor = shiftDay(cursor, -1);
  }
  return streak;
}

export function longestStreak(completedDays: Set<string>): number {
  if (completedDays.size === 0) return 0;

  const sorted = [...completedDays].sort();
  let longest = 1;
  let run = 1;

  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1]!;
    const current = sorted[index]!;
    if (shiftDay(previous, 1) === current) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  return longest;
}

/** Completions in the last `days` days, as a fraction of the weekly target. */
export function weeklyConsistency(
  completedDays: Set<string>,
  targetPerWeek: number,
  today = new Date(),
): number {
  if (targetPerWeek <= 0) return 0;

  let hits = 0;
  let cursor = toDayKey(today);
  for (let index = 0; index < 7; index += 1) {
    if (completedDays.has(cursor)) hits += 1;
    cursor = shiftDay(cursor, -1);
  }

  return Math.min(1, hits / targetPerWeek);
}

/** The last `count` days, oldest first — for the small dot row on each habit. */
export function recentDays(count: number, today = new Date()): string[] {
  const keys: string[] = [];
  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - index);
    keys.push(toDayKey(date));
  }
  return keys;
}

export type ContributionCell = {
  key: string;
  date: Date;
  count: number;
  /** 0–4, for colour intensity. */
  level: number;
};

/**
 * A GitHub-style grid: full weeks, oldest first, each column a week.
 *
 * Intensity is scaled against the busiest day in the window rather than a
 * fixed threshold, so the graph stays readable whether someone tracks one
 * habit or ten.
 */
export function buildContributionGrid(
  countsByDay: Map<string, number>,
  weeks = 26,
  today = new Date(),
): ContributionCell[][] {
  const end = new Date(today);
  end.setHours(0, 0, 0, 0);
  // Wind back to the most recent Sunday so every column is a full week.
  end.setDate(end.getDate() + (6 - ((end.getDay() + 6) % 7)));

  const max = Math.max(1, ...countsByDay.values());

  const columns: ContributionCell[][] = [];
  for (let week = weeks - 1; week >= 0; week -= 1) {
    const column: ContributionCell[] = [];
    for (let day = 6; day >= 0; day -= 1) {
      const date = new Date(end);
      date.setDate(date.getDate() - (week * 7 + day));
      const key = toDayKey(date);
      const count = countsByDay.get(key) ?? 0;
      column.push({
        key,
        date,
        count,
        level: count === 0 ? 0 : Math.min(4, Math.ceil((count / max) * 4)),
      });
    }
    columns.push(column);
  }

  return columns;
}
