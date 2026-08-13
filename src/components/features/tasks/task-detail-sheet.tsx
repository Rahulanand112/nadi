"use client";

import { useCallback, useEffect, useState } from "react";
import type { TaskDTO } from "@/types/task";
import type { CommentDTO } from "@/types/comment";
import type { CollidableTask } from "@/lib/collision";
import { deriveStatus, formatDue, STATUS_STYLES } from "@/lib/task-status";
import { recurrenceLabel } from "@/lib/recurrence";
import { canReschedule, describeSuggestion, suggestNewDueDate } from "@/lib/reschedule";

/**
 * The task detail sheet.
 *
 * Introduced because three separate features all needed somewhere to live and
 * a task row is already dense: the reschedule suggestion, the collision
 * warning, and the comment thread. Bolting all three onto the row would make
 * the list unreadable for the common case where none of them apply.
 *
 * A sheet rather than a page. Opening a task must not lose the person's place
 * in the list — their filter, their search, their scroll position — and a
 * route change would either discard all of that or need it threaded through
 * the URL.
 */
export function TaskDetailSheet({
  task,
  collisions,
  onClose,
  onChanged,
}: {
  task: TaskDTO;
  collisions: CollidableTask[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [comments, setComments] = useState<CommentDTO[] | null>(null);
  const [draft, setDraft] = useState("");
  const [isPosting, setPosting] = useState(false);
  const [isRescheduling, setRescheduling] = useState(false);

  const status = deriveStatus(task);
  const styles = STATUS_STYLES[status];
  const showReschedule = canReschedule(task);

  const loadComments = useCallback(async () => {
    try {
      const response = await fetch(`/api/tasks/${task.id}/comments`);
      if (!response.ok) return;
      setComments((await response.json()) as CommentDTO[]);
    } catch {
      setComments([]);
    }
  }, [task.id]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  // Escape closes, matching every other dismissible layer people have used.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function reschedule() {
    setRescheduling(true);
    const suggestion = suggestNewDueDate(task);

    const response = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dueAt: suggestion.toISOString() }),
    });

    setRescheduling(false);
    if (response.ok) {
      onChanged();
      onClose();
    }
  }

  async function postComment(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;

    setPosting(true);
    const response = await fetch(`/api/tasks/${task.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setPosting(false);

    if (response.ok) {
      setDraft("");
      await loadComments();
      // Refreshes the count badge on the row behind the sheet.
      onChanged();
    }
  }

  async function deleteComment(commentId: string) {
    const response = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
    if (response.ok) {
      await loadComments();
      onChanged();
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-ink-950/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={task.title}
        className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-paper-200 bg-paper-0 p-5 shadow-2xl dark:border-ink-800 dark:bg-ink-900 sm:inset-x-auto sm:right-6 sm:top-6 sm:bottom-6 sm:w-96 sm:rounded-2xl sm:border"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-xl text-ink-900 dark:text-paper-50">
            {task.title}
          </h2>

          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg p-1 text-ink-400 hover:bg-paper-100 dark:hover:bg-ink-800"
          >
            <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true">
              <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className={`rounded-full px-2 py-0.5 font-medium ${styles.chip}`}>
            {styles.label}
          </span>
          <span className="text-ink-400" data-numeric>
            {formatDue(task.dueAt, task.isAllDay)}
          </span>
          {task.recurrence ? (
            <span className="text-ink-400">↻ {recurrenceLabel(task.recurrence)}</span>
          ) : null}
          {task.assignee ? (
            <span className="text-ink-400">&middot; {task.assignee.displayName}</span>
          ) : null}
        </div>

        {task.description ? (
          <p className="mt-3 whitespace-pre-wrap text-sm text-ink-600 dark:text-ink-400">
            {task.description}
          </p>
        ) : null}

        {/* Rescheduling. Offered, never applied automatically -- an overdue
            task is a signal that something was missed, and quietly folding it
            into today would erase exactly what the red badge is for. */}
        {showReschedule ? (
          <div className="mt-4 rounded-lg border border-status-overdue/30 bg-status-overdue-soft/40 p-3">
            <p className="text-xs text-ink-700 dark:text-paper-200">
              This is overdue. Move it to{" "}
              <strong>{describeSuggestion(suggestNewDueDate(task), task.isAllDay)}</strong>?
            </p>
            <button
              onClick={() => void reschedule()}
              disabled={isRescheduling}
              className="mt-2 rounded-lg bg-iris-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-iris-700 disabled:opacity-60"
            >
              {isRescheduling ? "Moving…" : "Reschedule"}
            </button>
          </div>
        ) : null}

        {/* Collision warning. Informational only -- nothing is blocked,
            because two things at once is sometimes exactly what somebody
            intends and the app is in no position to overrule them. */}
        {collisions.length > 0 ? (
          <div className="mt-4 rounded-lg border border-status-upcoming/30 bg-status-upcoming-soft/40 p-3">
            <p className="text-xs text-ink-700 dark:text-paper-200">
              {task.assignee?.displayName ?? "This person"} is also due to do{" "}
              {collisions.map((other, index) => (
                <span key={other.id}>
                  {index > 0 ? ", " : ""}
                  <strong>{other.title}</strong>
                </span>
              ))}{" "}
              around the same time.
            </p>
          </div>
        ) : null}

        <div className="mt-5 border-t border-paper-200 pt-4 dark:border-ink-800">
          <h3 className="text-xs font-medium uppercase tracking-wide text-ink-400">
            Comments
          </h3>

          {comments === null ? (
            <p className="mt-3 text-xs text-ink-400">Loading…</p>
          ) : comments.length === 0 ? (
            <p className="mt-3 text-xs text-ink-400">
              No comments yet. Useful for &ldquo;I&rsquo;ll do this after work&rdquo;.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {comments.map((comment) => (
                <li key={comment.id} className="group">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-medium text-ink-900 dark:text-paper-100">
                      {comment.membership.displayName}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-ink-400">
                        {formatWhen(comment.createdAt)}
                      </span>
                      <button
                        onClick={() => void deleteComment(comment.id)}
                        aria-label="Delete comment"
                        className="text-[11px] text-ink-400 opacity-0 transition hover:text-status-overdue focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink-700 dark:text-ink-300">
                    {comment.body}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={postComment} className="mt-4">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a comment…"
              rows={2}
              className="w-full resize-none rounded-lg border border-paper-300 bg-paper-0 px-3 py-2 text-sm outline-none focus:border-iris-600 dark:border-ink-800 dark:bg-ink-950 dark:text-paper-100"
            />
            <button
              type="submit"
              disabled={isPosting || !draft.trim()}
              className="mt-2 w-full rounded-lg bg-iris-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-iris-700 disabled:opacity-60"
            >
              {isPosting ? "Posting…" : "Comment"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

function formatWhen(iso: string): string {
  const at = new Date(iso);
  const minutes = Math.round((Date.now() - at.getTime()) / 60_000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`;

  return at.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
