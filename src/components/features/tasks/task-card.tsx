"use client";

import { deriveStatus, formatDue, STATUS_STYLES } from "@/lib/task-status";
import type { TaskDTO } from "@/types/task";
import { recurrenceLabel } from "@/lib/recurrence";

const PRIORITY_LABEL = { HIGH: "High", MEDIUM: "Medium", LOW: "Low" } as const;

export function TaskCard({
  task,
  showAssignee,
  collisionCount,
  onToggle,
  onDelete,
  onOpen,
  isPending,
}: {
  task: TaskDTO;
  showAssignee: boolean;
  /** How many other tasks clash with this one. Passed in rather than computed
   * here because collisions are a property of the whole list, not of one
   * card -- a card cannot see its neighbours. */
  collisionCount: number;
  onToggle: (task: TaskDTO) => void;
  onDelete: (task: TaskDTO) => void;
  onOpen: (task: TaskDTO) => void;
  isPending: boolean;
}) {
  const status = deriveStatus(task);
  const styles = STATUS_STYLES[status];
  const isDone = status === "done";

  return (
    <li
      className={`group flex items-start gap-3 rounded-card border border-paper-200 bg-paper-0 p-4 transition dark:border-ink-800 dark:bg-ink-900 ${
        isPending ? "opacity-60" : ""
      }`}
    >
      <button
        onClick={() => onToggle(task)}
        aria-label={isDone ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
        aria-pressed={isDone}
        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition ${
          isDone
            ? "border-status-done bg-status-done text-white"
            : "border-paper-300 hover:border-iris-600 dark:border-ink-600"
        }`}
      >
        {isDone ? (
          <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
            <path
              d="M3.5 8.5l3 3 6-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </button>

      {/* The body opens the detail sheet; the checkbox and Delete stay
          separate buttons so ticking something off never costs an extra tap
          through a panel. That is the action people take most, and it should
          stay the cheapest. */}
      <button
        onClick={() => onOpen(task)}
        className="min-w-0 flex-1 text-left"
        aria-label={`Open "${task.title}"`}
      >
        <p
          className={`text-sm ${
            isDone ? "text-ink-400 line-through" : "text-ink-900 dark:text-paper-100"
          }`}
        >
          {task.title}
        </p>

        {task.description ? (
          <p className="mt-1 line-clamp-2 text-xs text-ink-600 dark:text-ink-400">
            {task.description}
          </p>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className={`rounded-full px-2 py-0.5 font-medium ${styles.chip}`}>
            {styles.label}
          </span>

          <span className="text-ink-400" data-numeric>
            {formatDue(task.dueAt, task.isAllDay)}
          </span>

          {task.category ? (
            <span className="rounded-full bg-paper-100 px-2 py-0.5 text-ink-600 dark:bg-ink-800 dark:text-ink-400">
              {task.category}
            </span>
          ) : null}

          {task.priority !== "MEDIUM" ? (
            <span className="text-ink-400">{PRIORITY_LABEL[task.priority]} priority</span>
          ) : null}

          {task.recurrence ? (
            <span className="text-ink-400">↻ {recurrenceLabel(task.recurrence)}</span>
          ) : null}

          {/* Clash warning. Deliberately quiet -- an outline chip rather than
              a filled one, because two things at once is sometimes exactly
              what somebody meant and this is a heads-up, not an error. */}
          {collisionCount > 0 ? (
            <span className="rounded-full border border-status-upcoming/40 px-2 py-0.5 text-status-upcoming">
              Clashes with {collisionCount}
            </span>
          ) : null}

          {task.commentCount > 0 ? (
            <span className="text-ink-400" data-numeric>
              💬 {task.commentCount}
            </span>
          ) : null}

          {showAssignee && task.assignee ? (
            <span className="text-ink-400">&middot; {task.assignee.displayName}</span>
          ) : null}
        </div>
      </button>

      <button
        onClick={() => onDelete(task)}
        aria-label={`Delete "${task.title}"`}
        className="shrink-0 rounded-md px-2 py-1 text-xs text-ink-400 opacity-0 transition hover:text-status-overdue focus-visible:opacity-100 group-hover:opacity-100"
      >
        Delete
      </button>
    </li>
  );
}
