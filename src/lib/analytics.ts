/**
 * Productivity maths. Pure, so the same numbers can be computed on the server
 * for the leaderboard and in the browser for a single person's card.
 */

export type TaskFact = {
  dueAt: Date | string | null;
  completedAt: Date | string | null;
};

export type Stats = {
  total: number;
  completed: number;
  /** Incomplete, with a deadline that has passed. */
  overdue: number;
  completionRate: number;
  /** Of the completed tasks that had a deadline, how many landed on time. */
  onTimeRate: number;
  /** Mean hours late, over the late ones only. Null when nothing was late. */
  averageDelayHours: number | null;
  score: number;
};

function toDate(value: Date | string | null): Date | null {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

/**
 * A single 0–100 figure.
 *
 * Weighted 60% on finishing things and 40% on finishing them on time. Getting
 * work done matters more than getting it done punctually — a score that
 * punished lateness equally would rank someone who completes nothing above
 * someone who completes everything a day late, which is obviously wrong.
 *
 * Someone with no deadlined tasks isn't penalised for an on-time rate they
 * had no opportunity to earn: their score is their completion rate.
 */
export function computeStats(tasks: TaskFact[], now = new Date()): Stats {
  const total = tasks.length;

  let completed = 0;
  let overdue = 0;
  let deadlined = 0;
  let onTime = 0;
  let lateCount = 0;
  let lateHours = 0;

  for (const task of tasks) {
    const due = toDate(task.dueAt);
    const done = toDate(task.completedAt);

    if (done) {
      completed += 1;
      if (due) {
        deadlined += 1;
        if (done.getTime() <= due.getTime()) {
          onTime += 1;
        } else {
          lateCount += 1;
          lateHours += (done.getTime() - due.getTime()) / 3_600_000;
        }
      }
    } else if (due && due.getTime() < now.getTime()) {
      overdue += 1;
    }
  }

  const completionRate = total === 0 ? 0 : completed / total;
  const onTimeRate = deadlined === 0 ? 0 : onTime / deadlined;

  const score =
    total === 0
      ? 0
      : Math.round(
          (deadlined === 0
            ? completionRate
            : completionRate * 0.6 + onTimeRate * 0.4) * 100,
        );

  return {
    total,
    completed,
    overdue,
    completionRate,
    onTimeRate,
    averageDelayHours: lateCount === 0 ? null : lateHours / lateCount,
    score,
  };
}

export type TrendPoint = { label: string; completed: number; created: number };

/** Completed vs created per week, oldest first. Showing both matters: a
 * falling completion count means something different when intake fell too. */
export function weeklyTrend(
  tasks: { createdAt: Date | string; completedAt: Date | string | null }[],
  weeks = 8,
  now = new Date(),
): TrendPoint[] {
  const buckets: TrendPoint[] = [];
  const weekStarts: number[] = [];

  for (let index = weeks - 1; index >= 0; index -= 1) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    // Monday-based, consistent with the calendar.
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - index * 7);
    weekStarts.push(start.getTime());
    buckets.push({
      label: start.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
      completed: 0,
      created: 0,
    });
  }

  const bucketFor = (value: Date) => {
    for (let index = weekStarts.length - 1; index >= 0; index -= 1) {
      if (value.getTime() >= weekStarts[index]!) return index;
    }
    return -1;
  };

  for (const task of tasks) {
    const created = toDate(task.createdAt);
    const done = toDate(task.completedAt);

    if (created) {
      const index = bucketFor(created);
      if (index >= 0) buckets[index]!.created += 1;
    }
    if (done) {
      const index = bucketFor(done);
      if (index >= 0) buckets[index]!.completed += 1;
    }
  }

  return buckets;
}

export function formatDelay(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 1) return `${Math.round(hours * 60)}m late`;
  if (hours < 48) return `${hours.toFixed(1)}h late`;
  return `${(hours / 24).toFixed(1)}d late`;
}
