"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  WEEKDAY_LABELS,
  addDays,
  addMonths,
  buildMonthGrid,
  buildWeek,
  dayKey,
  formatMonthTitle,
  formatWeekTitle,
  groupByDay,
  moveToDay,
} from "@/lib/calendar";
import { deriveStatus, formatDue, STATUS_STYLES } from "@/lib/task-status";
import type { TaskDTO } from "@/types/task";
import { useDayDrag } from "./use-day-drag";

type Mode = "month" | "week";

export function CalendarView({
  tasks,
  showAssignee,
}: {
  tasks: TaskDTO[];
  showAssignee: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedKey, setSelectedKey] = useState<string>(() => dayKey(new Date()));

  /** Days whose task moved but whose refresh has not landed yet. Held so the
   * task appears on its new date the instant the finger lifts: waiting for the
   * server round trip would leave it sitting on the old day for a moment,
   * which reads as the drag having failed. */
  const [optimistic, setOptimistic] = useState<Map<string, string>>(new Map());

  const effectiveTasks = useMemo(
    () =>
      tasks.map((task) => {
        const movedTo = optimistic.get(task.id);
        if (!movedTo || !task.dueAt) return task;
        return { ...task, dueAt: moveToDay(task.dueAt, movedTo).toISOString() };
      }),
    [tasks, optimistic],
  );

  const byDay = useMemo(() => groupByDay(effectiveTasks), [effectiveTasks]);
  const days = useMemo(
    () => (mode === "month" ? buildMonthGrid(anchor) : buildWeek(anchor)),
    [mode, anchor],
  );

  async function moveTask(taskId: string, targetKey: string) {
    const task = tasks.find((candidate) => candidate.id === taskId);
    if (!task?.dueAt) return;
    if (dayKey(new Date(task.dueAt)) === targetKey) return;

    setOptimistic((current) => new Map(current).set(taskId, targetKey));

    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dueAt: moveToDay(task.dueAt, targetKey).toISOString() }),
    });

    if (!response.ok) {
      // Snap back. A task silently sitting on the wrong day is worse than a
      // visible bounce, because the person would believe it had moved.
      setOptimistic((current) => {
        const next = new Map(current);
        next.delete(taskId);
        return next;
      });
      return;
    }

    setSelectedKey(targetKey);
    startTransition(() => {
      router.refresh();
      // Cleared only after the refresh is queued, so the real data replaces
      // the optimistic entry rather than the task flickering back and forth.
      setOptimistic(new Map());
    });
  }

  const { dragId, hoverKey, ghost, handleProps } = useDayDrag({
    onDrop: (taskId, targetKey) => void moveTask(taskId, targetKey),
  });

  const selectedTasks = byDay.get(selectedKey) ?? [];
  const selectedDate = new Date(`${selectedKey}T00:00:00`);
  const draggingTask = dragId
    ? (effectiveTasks.find((task) => task.id === dragId) ?? null)
    : null;

  function step(direction: -1 | 1) {
    setAnchor((current) =>
      mode === "month" ? addMonths(current, direction) : addDays(current, direction * 7),
    );
  }

  function goToday() {
    const today = new Date();
    setAnchor(today);
    setSelectedKey(dayKey(today));
  }

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => step(-1)}
            aria-label={mode === "month" ? "Previous month" : "Previous week"}
            className="grid size-8 place-items-center rounded-lg text-ink-600 transition hover:bg-paper-100 dark:text-ink-400 dark:hover:bg-ink-900"
          >
            ‹
          </button>
          <h2 className="min-w-44 text-center text-sm font-medium text-ink-900 dark:text-paper-100">
            {mode === "month" ? formatMonthTitle(anchor) : formatWeekTitle(anchor)}
          </h2>
          <button
            onClick={() => step(1)}
            aria-label={mode === "month" ? "Next month" : "Next week"}
            className="grid size-8 place-items-center rounded-lg text-ink-600 transition hover:bg-paper-100 dark:text-ink-400 dark:hover:bg-ink-900"
          >
            ›
          </button>
          <button
            onClick={goToday}
            className="ml-1 rounded-lg px-2.5 py-1 text-xs font-medium text-iris-600 transition hover:bg-iris-50 dark:hover:bg-ink-900"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-paper-100 p-1 dark:bg-ink-900">
          {(["month", "week"] as Mode[]).map((option) => (
            <button
              key={option}
              onClick={() => setMode(option)}
              aria-pressed={mode === option}
              className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition ${
                mode === option
                  ? "bg-paper-0 text-ink-900 shadow-sm dark:bg-ink-800 dark:text-paper-100"
                  : "text-ink-600 dark:text-ink-400"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-px overflow-hidden rounded-card border border-paper-200 bg-paper-200 dark:border-ink-800 dark:bg-ink-800">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="bg-paper-50 py-2 text-center text-[11px] font-medium uppercase tracking-wider text-ink-400 dark:bg-ink-950"
          >
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{label[0]}</span>
          </div>
        ))}

        {days.map((day) => {
          const dayTasks = byDay.get(day.key) ?? [];
          const isSelected = day.key === selectedKey;
          const isDropTarget = hoverKey === day.key;

          return (
            <button
              key={day.key}
              // Read back by the drag hook's hit test. The gesture captures the
              // pointer, so day cells never receive it directly and have to be
              // identified from coordinates instead.
              data-day-key={day.key}
              onClick={() => setSelectedKey(day.key)}
              aria-label={`${day.date.toDateString()}, ${dayTasks.length} tasks`}
              aria-pressed={isSelected}
              className={`flex flex-col gap-1 bg-paper-0 p-1.5 text-left transition dark:bg-ink-900 ${
                mode === "month" ? "min-h-20" : "min-h-32"
              } ${day.isCurrentMonth ? "" : "opacity-40"} ${
                isDropTarget
                  ? "bg-iris-50 ring-2 ring-inset ring-iris-600 dark:bg-ink-800"
                  : isSelected
                    ? "ring-2 ring-inset ring-iris-600"
                    : "hover:bg-paper-50 dark:hover:bg-ink-800"
              }`}
            >
              <span
                data-numeric
                className={`grid size-6 shrink-0 place-items-center rounded-full text-xs ${
                  day.isToday
                    ? "bg-iris-600 font-medium text-white"
                    : "text-ink-600 dark:text-ink-400"
                }`}
              >
                {day.date.getDate()}
              </span>

              <span className="flex flex-wrap gap-0.5">
                {dayTasks.slice(0, mode === "month" ? 4 : 8).map((task) => (
                  <span
                    key={task.id}
                    aria-hidden="true"
                    className={`size-1.5 rounded-full ${STATUS_STYLES[deriveStatus(task)].dot}`}
                  />
                ))}
                {dayTasks.length > (mode === "month" ? 4 : 8) ? (
                  <span className="text-[10px] leading-none text-ink-400">
                    +{dayTasks.length - (mode === "month" ? 4 : 8)}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      <section className="mt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-xs uppercase tracking-widest text-ink-400">
            {selectedDate.toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </h3>

          {selectedTasks.length > 0 ? (
            <p className="text-[11px] text-ink-400">
              Drag the grip onto a day to move a task
            </p>
          ) : null}
        </div>

        {selectedTasks.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {selectedTasks.map((task) => {
              const status = deriveStatus(task);
              const isDragging = dragId === task.id;

              return (
                <li
                  key={task.id}
                  className={`flex items-start gap-2 rounded-card border border-paper-200 bg-paper-0 p-3 transition dark:border-ink-800 dark:bg-ink-900 ${
                    isDragging ? "opacity-40" : ""
                  }`}
                >
                  {/* A dedicated grip rather than dragging the whole card.
                      The handle carries touch-action: none, and applying that
                      to the entire card would stop the page scrolling wherever
                      a finger happened to land on one. */}
                  <button
                    {...handleProps(task.id)}
                    aria-label={`Move "${task.title}" to another day`}
                    className="mt-0.5 shrink-0 cursor-grab rounded p-1 text-ink-400 transition hover:bg-paper-100 active:cursor-grabbing dark:hover:bg-ink-800"
                  >
                    <svg viewBox="0 0 16 16" className="size-3.5" fill="currentColor" aria-hidden="true">
                      <circle cx="6" cy="4" r="1.3" />
                      <circle cx="10" cy="4" r="1.3" />
                      <circle cx="6" cy="8" r="1.3" />
                      <circle cx="10" cy="8" r="1.3" />
                      <circle cx="6" cy="12" r="1.3" />
                      <circle cx="10" cy="12" r="1.3" />
                    </svg>
                  </button>

                  <span
                    aria-hidden="true"
                    className={`mt-2 size-2 shrink-0 rounded-full ${STATUS_STYLES[status].dot}`}
                  />

                  <div className="min-w-0">
                    <p
                      className={`text-sm ${
                        status === "done"
                          ? "text-ink-400 line-through"
                          : "text-ink-900 dark:text-paper-100"
                      }`}
                    >
                      {task.title}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      <span data-numeric>{formatDue(task.dueAt, task.isAllDay)}</span>
                      {showAssignee && task.assignee
                        ? ` · ${task.assignee.displayName}`
                        : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-ink-400">Nothing scheduled.</p>
        )}
      </section>

      {/* The drag ghost. HTML5 drag-and-drop would have supplied one; Pointer
          Events supply nothing, so it is drawn by hand. pointer-events-none is
          essential — without it the ghost sits under the cursor and every hit
          test finds the ghost instead of the day beneath it. */}
      {draggingTask && ghost ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-iris-600 bg-paper-0 px-3 py-1.5 text-xs font-medium text-ink-900 shadow-lg dark:bg-ink-900 dark:text-paper-100"
          style={{ left: ghost.x, top: ghost.y }}
        >
          {draggingTask.title}
        </div>
      ) : null}
    </>
  );
}
