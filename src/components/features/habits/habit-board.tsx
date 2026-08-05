"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { HabitDTO } from "@/types/habit";
import type { MemberOption } from "@/types/task";
import { HabitRow } from "./habit-row";

const SUGGESTED_ICONS = ["💪", "💧", "📖", "🧘", "🏃", "🥗", "😴", "✍️"];

export function HabitBoard({
  slug,
  habits,
  members,
  myMembershipId,
  scope,
}: {
  slug: string;
  habits: HabitDTO[];
  members: MemberOption[];
  myMembershipId: string;
  scope: "mine" | "everyone";
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [isCreating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [target, setTarget] = useState(7);
  const [membershipId, setMembershipId] = useState(myMembershipId);
  const [isSaving, setSaving] = useState(false);

  async function toggle(habitId: string, day: string, done: boolean) {
    const response = await fetch(`/api/habits/${habitId}/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day, done }),
    });
    if (!response.ok) throw new Error("toggle failed");
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);

    const response = await fetch(`/api/workspaces/${slug}/habits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        icon: icon || null,
        targetPerWeek: target,
        membershipId,
      }),
    });

    setSaving(false);
    if (response.ok) {
      setName("");
      setIcon("");
      setTarget(7);
      setCreating(false);
      startTransition(() => router.refresh());
    }
  }

  return (
    <>
      <div className="mt-6 flex items-center gap-1 rounded-lg bg-paper-100 p-1 dark:bg-ink-900">
        {(["mine", "everyone"] as const).map((option) => (
          <button
            key={option}
            onClick={() => router.push(`/w/${slug}/habits?scope=${option}`)}
            aria-pressed={scope === option}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              scope === option
                ? "bg-paper-0 text-ink-900 shadow-sm dark:bg-ink-800 dark:text-paper-100"
                : "text-ink-600 hover:text-ink-900 dark:text-ink-400"
            }`}
          >
            {option === "mine" ? "My habits" : "Everyone"}
          </button>
        ))}
      </div>

      {isCreating ? (
        <form
          onSubmit={create}
          className="mt-4 rounded-card border border-paper-200 bg-paper-0 p-4 dark:border-ink-800 dark:bg-ink-900"
        >
          <input
            autoFocus
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="What do you want to do regularly?"
            className="w-full rounded-lg border border-paper-300 bg-paper-0 px-3 py-2 text-sm outline-none focus:border-iris-600 dark:border-ink-800 dark:bg-ink-950 dark:text-paper-100"
          />

          <div className="mt-3 flex flex-wrap gap-1.5">
            {SUGGESTED_ICONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setIcon(icon === option ? "" : option)}
                aria-pressed={icon === option}
                className={`grid size-9 place-items-center rounded-lg border text-lg transition ${
                  icon === option
                    ? "border-iris-600 bg-iris-50 dark:bg-ink-800"
                    : "border-paper-200 hover:border-paper-300 dark:border-ink-800"
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-xs text-ink-400">Days per week</span>
              <select
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
                className="w-full rounded-lg border border-paper-300 bg-paper-0 px-3 py-2 text-sm dark:border-ink-800 dark:bg-ink-950 dark:text-paper-100"
              >
                {[7, 6, 5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>
                    {value === 7 ? "Every day" : `${value}× a week`}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs text-ink-400">For</span>
              <select
                value={membershipId}
                onChange={(e) => setMembershipId(e.target.value)}
                className="w-full rounded-lg border border-paper-300 bg-paper-0 px-3 py-2 text-sm dark:border-ink-800 dark:bg-ink-950 dark:text-paper-100"
              >
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.displayName}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="rounded-lg px-3 py-2 text-sm text-ink-600 hover:bg-paper-100 dark:text-ink-400 dark:hover:bg-ink-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="rounded-lg bg-iris-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-iris-700 disabled:opacity-60"
            >
              {isSaving ? "Adding…" : "Add habit"}
            </button>
          </div>
        </form>
      ) : null}

      {habits.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {habits.map((habit) => (
            <HabitRow
              key={habit.id}
              habit={habit}
              showOwner={scope === "everyone"}
              onToggle={toggle}
            />
          ))}
        </ul>
      ) : (
        <p className="mt-10 text-center text-sm text-ink-400">
          No habits yet. Streaks start with one day.
        </p>
      )}

      {!isCreating ? (
        <button
          onClick={() => setCreating(true)}
          aria-label="Add a habit"
          className="fixed bottom-6 right-6 grid size-14 place-items-center rounded-full bg-iris-600 text-2xl text-white shadow-lg transition hover:bg-iris-700"
        >
          +
        </button>
      ) : null}
    </>
  );
}
