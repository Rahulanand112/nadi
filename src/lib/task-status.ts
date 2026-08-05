/**
 * Task status is derived, never stored.
 *
 * A stored status column would be wrong the instant a due time passes, and
 * would need a cron job to repair. Deriving it from completedAt and dueAt
 * means every read is correct by construction.
 *
 * This module is pure and framework-free so the same logic runs on the server
 * (list queries, analytics) and in the browser (optimistic checkbox updates).
 * One definition, no drift.
 */

export type TaskStatus = "done" | "upcoming" | "overdue";

export type StatusInput = {
  completedAt: Date | string | null;
  dueAt: Date | string | null;
};

export function deriveStatus(task: StatusInput, now: Date = new Date()): TaskStatus {
  if (task.completedAt) return "done";
  if (!task.dueAt) return "upcoming";

  const due = task.dueAt instanceof Date ? task.dueAt : new Date(task.dueAt);
  return due.getTime() < now.getTime() ? "overdue" : "upcoming";
}

/** Tailwind classes per status. Kept beside the logic so a new status can
 * never be added without someone deciding what it looks like. */
export const STATUS_STYLES: Record<
  TaskStatus,
  { dot: string; chip: string; label: string }
> = {
  done: {
    dot: "bg-status-done",
    chip: "bg-status-done-soft text-status-done",
    label: "Completed",
  },
  upcoming: {
    dot: "bg-status-upcoming",
    chip: "bg-status-upcoming-soft text-status-upcoming",
    label: "Upcoming",
  },
  overdue: {
    dot: "bg-status-overdue",
    chip: "bg-status-overdue-soft text-status-overdue",
    label: "Overdue",
  },
};

export function isToday(value: Date | string | null, now: Date = new Date()): boolean {
  if (!value) return false;
  const date = value instanceof Date ? value : new Date(value);
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

/** "Today, 6:00 pm" / "12 Aug" / "No deadline" — one place so every surface
 * formats dates identically. */
export function formatDue(
  dueAt: Date | string | null,
  isAllDay: boolean,
  now: Date = new Date(),
): string {
  if (!dueAt) return "No deadline";
  const date = dueAt instanceof Date ? dueAt : new Date(dueAt);

  const time = isAllDay
    ? ""
    : date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  if (isToday(date, now)) return time ? `Today, ${time}` : "Today";

  const day = date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return time ? `${day}, ${time}` : day;
}
