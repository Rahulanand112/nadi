"use client";

import { useState } from "react";
import type { MemberOption } from "@/types/task";
import { RECURRENCE_OPTIONS, type Recurrence } from "@/lib/recurrence";
import {
  DEFAULT_REMINDER_OFFSET_MINUTES,
  REMINDER_OFFSETS,
} from "@/lib/reminder";

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
    recurrence: Recurrence | null;
    reminderEnabled: boolean;
    reminderOffsetMinutes: number;
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
  const [recurrence, setRecurrence] = useState<Recurrence | "">("");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderOffset, setReminderOffset] = useState<number>(
    DEFAULT_REMINDER_OFFSET_MINUTES,
  );
  const [isSaving, setSaving] = useState(false);

  // A reminder counts backwards from a deadline, so with no deadline there is
  // nothing to count from. The control is disabled rather than hidden so the
  // feature stays discoverable — and switched off in the same breath, so the
  // form never shows a reminder as on while the server drops it.
  const canRemind = Boolean(dueDate);

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
      recurrence: recurrence || null,
      reminderEnabled: canRemind && reminderEnabled,
      reminderOffsetMinutes: reminderOffset,
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
            onChange={(e) => {
              setDueDate(e.target.value);
              if (!e.target.value) setReminderEnabled(false);
            }}
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

      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category (optional)"
          className={inputClass}
        />

        <label className="block">
          <select
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as Recurrence | "")}
            disabled={!dueDate}
            title={dueDate ? undefined : "Set a due date first — a repeat needs something to repeat from"}
            className={`${inputClass} disabled:opacity-50`}
          >
            {RECURRENCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 rounded-lg border border-paper-200 px-3 py-2.5 dark:border-ink-800">
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor="task-reminder"
            className={`flex-1 text-sm ${
              canRemind ? "text-ink-800 dark:text-paper-200" : "text-ink-400"
            }`}
            title={canRemind ? undefined : "Set a due date first — a reminder needs a deadline to count back from"}
          >
            Remind me
          </label>

          <input
            id="task-reminder"
            type="checkbox"
            checked={canRemind && reminderEnabled}
            disabled={!canRemind}
            onChange={(e) => setReminderEnabled(e.target.checked)}
            className="size-4 accent-iris-600 disabled:opacity-40"
          />
        </div>

        {canRemind && reminderEnabled ? (
          <select
            value={reminderOffset}
            onChange={(e) => setReminderOffset(Number(e.target.value))}
            aria-label="How long before the deadline"
            className={`${inputClass} mt-2.5`}
          >
            {REMINDER_OFFSETS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : null}
      </div>

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
