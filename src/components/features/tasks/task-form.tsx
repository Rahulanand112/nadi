"use client";

import { useState } from "react";
import type { MemberOption } from "@/types/task";

const inputClass =
  "w-full rounded-lg border border-paper-300 bg-paper-0 px-3 py-2 text-sm text-ink-900 outline-none focus:border-iris-600 dark:border-ink-800 dark:bg-ink-950 dark:text-paper-100";

export function TaskForm({
  members,
  defaultAssigneeId,
  onCreate,
  onCancel,
}: {
  members: MemberOption[];
  defaultAssigneeId: string;
  onCreate: (input: {
    title: string;
    description: string | null;
    category: string | null;
    priority: "LOW" | "MEDIUM" | "HIGH";
    dueAt: string | null;
    isAllDay: boolean;
    assigneeId: string;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [assigneeId, setAssigneeId] = useState(defaultAssigneeId);
  const [isSaving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);

    // A date with no time means "sometime that day" — stored at end of day so
    // it doesn't turn red at midnight when the person still has all day.
    const isAllDay = Boolean(dueDate) && !dueTime;
    const dueAt = dueDate
      ? new Date(`${dueDate}T${dueTime || "23:59"}`).toISOString()
      : null;

    await onCreate({
      title: title.trim(),
      description: description.trim() || null,
      category: category.trim() || null,
      priority,
      dueAt,
      isAllDay,
      assigneeId,
    });

    setSaving(false);
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-card border border-paper-200 bg-paper-0 p-4 dark:border-ink-800 dark:bg-ink-900"
    >
      <input
        autoFocus
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What needs doing?"
        className={`${inputClass} text-base`}
      />

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Notes (optional)"
        rows={2}
        className={`${inputClass} mt-2 resize-none`}
      />

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-xs text-ink-400">Due date</span>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-ink-400">Time</span>
          <input
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
            disabled={!dueDate}
            className={`${inputClass} disabled:opacity-50`}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-ink-400">Priority</span>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as typeof priority)}
            className={inputClass}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-ink-400">For</span>
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className={inputClass}
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.displayName}
              </option>
            ))}
          </select>
        </label>
      </div>

      <input
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="Category (optional) — e.g. Chores, Study, Work"
        className={`${inputClass} mt-2`}
      />

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-2 text-sm text-ink-600 hover:bg-paper-100 dark:text-ink-400 dark:hover:bg-ink-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving || !title.trim()}
          className="rounded-lg bg-iris-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-iris-700 disabled:opacity-60"
        >
          {isSaving ? "Adding…" : "Add task"}
        </button>
      </div>
    </form>
  );
}
