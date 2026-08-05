"use client";

import { useMemo, useState } from "react";
import {
  currentStreak,
  longestStreak,
  recentDays,
  toDayKey,
  weeklyConsistency,
} from "@/lib/streak";
import type { HabitDTO } from "@/types/habit";

const WEEKDAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

export function HabitRow({
  habit,
  showOwner,
  onToggle,
}: {
  habit: HabitDTO;
  showOwner: boolean;
  onToggle: (habitId: string, day: string, done: boolean) => Promise<void>;
}) {
  const [busyDay, setBusyDay] = useState<string | null>(null);

  // Held in state so an optimistic tick shows instantly rather than waiting
  // for the server round trip and a page refresh.
  const [days, setDays] = useState<Set<string>>(() => new Set(habit.completedDays));

  const todayKey = toDayKey(new Date());
  const isDoneToday = days.has(todayKey);

  const stats = useMemo(
    () => ({
      current: currentStreak(days),
      longest: longestStreak(days),
      consistency: Math.round(weeklyConsistency(days, habit.targetPerWeek) * 100),
    }),
    [days, habit.targetPerWeek],
  );

  const lastWeek = useMemo(() => recentDays(7), []);

  async function toggle(day: string) {
    const done = !days.has(day);
    setBusyDay(day);

    setDays((current) => {
      const next = new Set(current);
      if (done) next.add(day);
      else next.delete(day);
      return next;
    });

    try {
      await onToggle(habit.id, day, done);
    } catch {
      // Roll the optimistic update back if the server rejected it.
      setDays((current) => {
        const next = new Set(current);
        if (done) next.delete(day);
        else next.add(day);
        return next;
      });
    } finally {
      setBusyDay(null);
    }
  }

  return (
    <li className="rounded-card border border-paper-200 bg-paper-0 p-4 dark:border-ink-800 dark:bg-ink-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span aria-hidden="true" className="text-lg">
            {habit.icon || "◍"}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink-900 dark:text-paper-100">
              {habit.name}
            </p>
            <p className="text-xs text-ink-400">
              {showOwner ? `${habit.membership.displayName} · ` : ""}
              {habit.targetPerWeek === 7
                ? "Every day"
                : `${habit.targetPerWeek}× a week`}
            </p>
          </div>
        </div>

        <button
          onClick={() => toggle(todayKey)}
          disabled={busyDay === todayKey}
          aria-pressed={isDoneToday}
          aria-label={isDoneToday ? `Undo ${habit.name} for today` : `Mark ${habit.name} done today`}
          className={`grid size-9 shrink-0 place-items-center rounded-full border transition ${
            isDoneToday
              ? "border-status-done bg-status-done text-white"
              : "border-paper-300 text-ink-400 hover:border-iris-600 hover:text-iris-600 dark:border-ink-600"
          } ${busyDay === todayKey ? "opacity-60" : ""}`}
        >
          <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
            <path
              d="M3.5 8.5l3 3 6-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="flex gap-1.5">
          {lastWeek.map((day) => {
            const date = new Date(`${day}T00:00:00`);
            const done = days.has(day);
            return (
              <button
                key={day}
                onClick={() => toggle(day)}
                disabled={busyDay === day}
                aria-label={`${date.toDateString()}: ${done ? "done" : "not done"}`}
                aria-pressed={done}
                className="flex flex-col items-center gap-1"
              >
                <span className="text-[10px] text-ink-400">
                  {WEEKDAY_INITIALS[date.getDay()]}
                </span>
                <span
                  className={`size-5 rounded-md border transition ${
                    done
                      ? "border-status-done bg-status-done"
                      : "border-paper-300 hover:border-iris-600 dark:border-ink-600"
                  }`}
                />
              </button>
            );
          })}
        </div>

        <dl className="flex shrink-0 gap-4 text-right">
          <div>
            <dd
              data-numeric
              className={`text-lg leading-none ${
                stats.current > 0
                  ? "text-ink-900 dark:text-paper-100"
                  : "text-ink-400"
              }`}
            >
              {stats.current}
            </dd>
            <dt className="mt-0.5 text-[10px] uppercase tracking-wider text-ink-400">
              Streak
            </dt>
          </div>
          <div>
            <dd data-numeric className="text-lg leading-none text-ink-600 dark:text-ink-400">
              {stats.longest}
            </dd>
            <dt className="mt-0.5 text-[10px] uppercase tracking-wider text-ink-400">
              Best
            </dt>
          </div>
          <div>
            <dd data-numeric className="text-lg leading-none text-ink-600 dark:text-ink-400">
              {stats.consistency}%
            </dd>
            <dt className="mt-0.5 text-[10px] uppercase tracking-wider text-ink-400">
              Week
            </dt>
          </div>
        </dl>
      </div>
    </li>
  );
}
