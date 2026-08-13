/**
 * Collision detection.
 *
 * Two tasks collide when the same person is expected to be doing both at
 * roughly the same moment. Derived at read time from the task list, never
 * stored — the same reasoning as task status: a stored "collides" flag would
 * be wrong the instant either task moved, and would need repairing by a job.
 *
 * A note on what this can and cannot see. Nadi's tasks have a deadline but no
 * duration, so there is no interval to overlap. "At the same time" therefore
 * means "due within a short window of each other", which is a proxy rather
 * than a real answer: two tasks due five minutes apart genuinely conflict,
 * while a two-hour task and a five-minute one due ninety minutes apart also
 * conflict and this will not notice. Adding durations would fix that, and
 * would also mean asking somebody to estimate how long emptying the bins
 * takes every time they add it — a real cost paid on every task to improve a
 * warning that only matters occasionally. The window is the cheaper trade,
 * and this comment is here so the trade is visible when it stops being the
 * right one.
 */

const MINUTE_MS = 60_000;

/** How close two deadlines must be to count as colliding. Thirty minutes is
 * chosen to be roughly "you cannot plausibly do both" for household tasks
 * without flagging a morning full of loosely-scheduled items. */
export const COLLISION_WINDOW_MINUTES = 30;

export type CollidableTask = {
  id: string;
  title: string;
  dueAt: string | Date | null;
  isAllDay: boolean;
  completedAt: string | Date | null;
  assignee: { id: string; displayName: string } | null;
};

/** All-day tasks are excluded deliberately: "sometime on Tuesday" cannot
 * conflict with anything, and treating a 23:59 placeholder as a real
 * appointment would flag every all-day task against every other one. */
function isSchedulable(task: CollidableTask): boolean {
  return Boolean(
    !task.completedAt && task.dueAt && !task.isAllDay && task.assignee,
  );
}

/**
 * Maps each task id to the other tasks it clashes with.
 *
 * Sorted-and-scanned rather than compared pair by pair: sorting once and
 * walking forward only until the window is exceeded keeps this linear in
 * practice, where the naive version is quadratic. On a household list either
 * would be fine, but a workspace with a year of history is a different
 * matter, and this runs on every render.
 */
export function findCollisions(
  tasks: CollidableTask[],
): Map<string, CollidableTask[]> {
  const collisions = new Map<string, CollidableTask[]>();

  const schedulable = tasks
    .filter(isSchedulable)
    .map((task) => ({ task, at: toTime(task.dueAt!) }))
    .sort((a, b) => a.at - b.at);

  const windowMs = COLLISION_WINDOW_MINUTES * MINUTE_MS;

  for (let i = 0; i < schedulable.length; i += 1) {
    // Read once and narrow. Indexing inside the inner loop returns
    // `T | undefined` under noUncheckedIndexedAccess, and repeating the
    // lookup would mean repeating the check.
    const earlier = schedulable[i];
    if (!earlier) continue;

    for (let j = i + 1; j < schedulable.length; j += 1) {
      const later = schedulable[j];
      if (!later) continue;

      const gap = later.at - earlier.at;
      // Sorted ascending, so once the gap is too large every later task is
      // too late as well.
      if (gap > windowMs) break;

      const a = earlier.task;
      const b = later.task;

      // Only the same person can be double-booked. Two people in a household
      // doing different things at 7pm is the normal case, not a problem.
      if (a.assignee!.id !== b.assignee!.id) continue;

      push(collisions, a.id, b);
      push(collisions, b.id, a);
    }
  }

  return collisions;
}

/** Appends to the list for a key, creating it on first use. Pulled out
 * because the nested loop touches it twice and the inline version obscured
 * the scan logic. */
function push(
  map: Map<string, CollidableTask[]>,
  key: string,
  value: CollidableTask,
): void {
  const existing = map.get(key);
  if (existing) {
    existing.push(value);
  } else {
    map.set(key, [value]);
  }
}

/**
 * Whether a task being created would clash with anything existing.
 *
 * Used by the form to warn *before* saving. Warning after the fact is
 * technically the same information, but by then the person has committed and
 * the message reads as a complaint rather than a heads-up.
 */
export function wouldCollide(
  candidate: { dueAt: Date | null; isAllDay: boolean; assigneeId: string | null },
  existing: CollidableTask[],
): CollidableTask[] {
  if (!candidate.dueAt || candidate.isAllDay || !candidate.assigneeId) return [];

  const at = candidate.dueAt.getTime();
  const windowMs = COLLISION_WINDOW_MINUTES * MINUTE_MS;

  return existing.filter((task) => {
    if (!isSchedulable(task)) return false;
    if (task.assignee!.id !== candidate.assigneeId) return false;
    return Math.abs(toTime(task.dueAt!) - at) <= windowMs;
  });
}

function toTime(value: string | Date): number {
  return (value instanceof Date ? value : new Date(value)).getTime();
}
