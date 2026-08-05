"use client";

import { useMemo, useState } from "react";
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
} from "@/lib/calendar";
import { deriveStatus, formatDue, STATUS_STYLES } from "@/lib/task-status";
import type { TaskDTO } from "@/types/task";

type Mode = "month" | "week";

export function CalendarView({
  tasks,
  showAssignee,
}: {
  tasks: TaskDTO[];
  showAssignee: boolean;
}) {
  const [mode, setMode] = useState<Mode>("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedKey, setSelectedKey] = useState<string>(() => dayKey(new Date()));

  const byDay = useMemo(() => groupByDay(tasks), [tasks]);
  const days = useMemo(
    () => (mode === "month" ? buildMonthGrid(anchor) : buildWeek(anchor)),
    [mode, anchor],
  );

  const selectedTasks = byDay.get(selectedKey) ?? [];
  const selectedDate = new Date(`${selectedKey}T00:00:00`);

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

          return (
            <button
              key={day.key}
              onClick={() => setSelectedKey(day.key)}
              aria-label={`${day.date.toDateString()}, ${dayTasks.length} tasks`}
              aria-pressed={isSelected}
              className={`flex flex-col gap-1 bg-paper-0 p-1.5 text-left transition dark:bg-ink-900 ${
                mode === "month" ? "min-h-20" : "min-h-32"
              } ${day.isCurrentMonth ? "" : "opacity-40"} ${
                isSelected ? "ring-2 ring-inset ring-iris-600" : "hover:bg-paper-50 dark:hover:bg-ink-800"
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
        <h3 className="text-xs uppercase tracking-widest text-ink-400">
          {selectedDate.toLocaleDateString(undefined, {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </h3>

        {selectedTasks.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {selectedTasks.map((task) => {
              const status = deriveStatus(task);
              return (
                <li
                  key={task.id}
                  className="flex items-start gap-3 rounded-card border border-paper-200 bg-paper-0 p-3 dark:border-ink-800 dark:bg-ink-900"
                >
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${STATUS_STYLES[status].dot}`}
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
    </>
  );
}
