"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deriveStatus, isToday } from "@/lib/task-status";
import type { TaskDTO, MemberOption } from "@/types/task";
import { TaskCard } from "./task-card";
import { TaskForm } from "./task-form";

type Scope = "mine" | "everyone";
type Filter = "today" | "upcoming" | "overdue" | "done" | "all";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "overdue", label: "Overdue" },
  { id: "done", label: "Done" },
  { id: "all", label: "All" },
];

export function TaskBoard({
  slug,
  tasks,
  members,
  myMembershipId,
  initialScope,
}: {
  slug: string;
  tasks: TaskDTO[];
  members: MemberOption[];
  myMembershipId: string;
  initialScope: Scope;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<Filter>("today");
  const [query, setQuery] = useState("");
  const [isCreating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const base = { today: 0, upcoming: 0, overdue: 0, done: 0, all: tasks.length };
    for (const task of tasks) {
      const status = deriveStatus(task);
      if (status === "done") base.done += 1;
      else if (status === "overdue") base.overdue += 1;
      else base.upcoming += 1;
      if (status !== "done" && isToday(task.dueAt)) base.today += 1;
    }
    return base;
  }, [tasks]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return tasks.filter((task) => {
      if (needle) {
        const haystack = `${task.title} ${task.description ?? ""} ${task.category ?? ""}`;
        if (!haystack.toLowerCase().includes(needle)) return false;
      }

      const status = deriveStatus(task);
      switch (filter) {
        case "today":
          return status !== "done" && isToday(task.dueAt);
        case "upcoming":
          return status === "upcoming";
        case "overdue":
          return status === "overdue";
        case "done":
          return status === "done";
        default:
          return true;
      }
    });
  }, [tasks, filter, query]);

  function setScope(next: Scope) {
    router.push(`/w/${slug}/dashboard?scope=${next}`);
  }

  async function createTask(input: Parameters<
    React.ComponentProps<typeof TaskForm>["onCreate"]
  >[0]) {
    const response = await fetch(`/api/workspaces/${slug}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (response.ok) {
      setCreating(false);
      startTransition(() => router.refresh());
    }
  }

  async function toggle(task: TaskDTO) {
    setBusyId(task.id);
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completedAt }),
    });
    setBusyId(null);
    startTransition(() => router.refresh());
  }

  async function remove(task: TaskDTO) {
    setBusyId(task.id);
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    setBusyId(null);
    startTransition(() => router.refresh());
  }

  return (
    <>
      <div className="mt-6 flex items-center gap-1 rounded-lg bg-paper-100 p-1 dark:bg-ink-900">
        {(["mine", "everyone"] as Scope[]).map((option) => (
          <button
            key={option}
            onClick={() => setScope(option)}
            aria-pressed={initialScope === option}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              initialScope === option
                ? "bg-paper-0 text-ink-900 shadow-sm dark:bg-ink-800 dark:text-paper-100"
                : "text-ink-600 hover:text-ink-900 dark:text-ink-400"
            }`}
          >
            {option === "mine" ? "My tasks" : "Everyone"}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((option) => (
          <button
            key={option.id}
            onClick={() => setFilter(option.id)}
            aria-pressed={filter === option.id}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              filter === option.id
                ? "bg-iris-600 text-white"
                : "bg-paper-100 text-ink-600 hover:bg-paper-200 dark:bg-ink-900 dark:text-ink-400"
            }`}
          >
            {option.label}
            <span className="ml-1.5 opacity-70" data-numeric>
              {counts[option.id]}
            </span>
          </button>
        ))}
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search tasks…"
        className="mt-4 w-full rounded-lg border border-paper-300 bg-paper-0 px-3 py-2 text-sm outline-none focus:border-iris-600 dark:border-ink-800 dark:bg-ink-900 dark:text-paper-100"
      />

      {isCreating ? (
        <div className="mt-4">
          <TaskForm
            members={members}
            defaultAssigneeId={myMembershipId}
            onCreate={createTask}
            onCancel={() => setCreating(false)}
          />
        </div>
      ) : null}

      {visible.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {visible.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              showAssignee={initialScope === "everyone"}
              onToggle={toggle}
              onDelete={remove}
              isPending={busyId === task.id || isPending}
            />
          ))}
        </ul>
      ) : (
        <p className="mt-8 text-center text-sm text-ink-400">
          {query
            ? "Nothing matches that search."
            : filter === "today"
              ? "Nothing due today."
              : "No tasks here yet."}
        </p>
      )}

      {!isCreating ? (
        <button
          onClick={() => setCreating(true)}
          aria-label="Add a task"
          className="fixed bottom-6 right-6 grid size-14 place-items-center rounded-full bg-iris-600 text-2xl text-white shadow-lg transition hover:bg-iris-700"
        >
          +
        </button>
      ) : null}
    </>
  );
}
