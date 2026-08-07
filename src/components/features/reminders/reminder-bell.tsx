"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReminderDTO, ReminderFeed } from "@/types/reminder";

/** How often the bell asks the server for new reminders.
 *
 * Polling, not a live connection. Real-time sync is a v0.5 slice, and building
 * a websocket here to save a minute of latency on a household reminder would
 * be infrastructure bought well ahead of any need for it. A minute is also
 * comfortably inside the sweep's own five-minute cadence, so the poll is never
 * the slowest link in the chain. */
const POLL_MS = 60_000;

export function ReminderBell({ slug }: { slug: string }) {
  const [feed, setFeed] = useState<ReminderFeed>({ reminders: [], unread: 0 });
  const [isOpen, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/workspaces/${slug}/reminders`);
      if (!response.ok) return;
      setFeed((await response.json()) as ReminderFeed);
    } catch {
      // A failed poll is not worth surfacing: the next one is a minute away,
      // and an error toast for a background refresh would be noise.
    }
  }, [slug]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  async function openAndMarkRead() {
    setOpen(true);
    if (feed.unread === 0) return;

    // Cleared straight away rather than after the request returns — the person
    // is looking at them now, so the badge should go now.
    setFeed((current) => ({ ...current, unread: 0 }));
    await fetch(`/api/workspaces/${slug}/reminders`, { method: "PATCH" });
    void load();
  }

  return (
    <div className="relative">
      <button
        onClick={() => (isOpen ? setOpen(false) : void openAndMarkRead())}
        aria-label={
          feed.unread > 0
            ? `Reminders, ${feed.unread} unread`
            : "Reminders"
        }
        aria-expanded={isOpen}
        className="relative grid size-8 place-items-center rounded-lg text-ink-400 transition hover:bg-paper-100 hover:text-ink-600 dark:hover:bg-ink-900"
      >
        <svg viewBox="0 0 20 20" className="size-4" fill="currentColor" aria-hidden="true">
          <path d="M10 2a5 5 0 00-5 5v3.6l-1.3 2.6A.8.8 0 004.4 15h11.2a.8.8 0 00.7-1.2L15 10.6V7a5 5 0 00-5-5zm0 16a2.5 2.5 0 002.4-2h-4.8A2.5 2.5 0 0010 18z" />
        </svg>

        {feed.unread > 0 ? (
          <span
            data-numeric
            className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-iris-600 px-1 text-[10px] leading-4 text-white"
          >
            {feed.unread > 9 ? "9+" : feed.unread}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-lg border border-paper-200 bg-paper-0 py-1 shadow-lg dark:border-ink-800 dark:bg-ink-900">
            {feed.reminders.length > 0 ? (
              <ul className="max-h-80 overflow-y-auto">
                {feed.reminders.map((reminder) => (
                  <li key={reminder.id}>
                    <ReminderItem reminder={reminder} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-3 py-6 text-center text-sm text-ink-400">
                Nothing yet. Reminders show up here when they&rsquo;re due.
              </p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

function ReminderItem({ reminder }: { reminder: ReminderDTO }) {
  return (
    <div className="px-3 py-2.5">
      <p className="truncate text-sm text-ink-900 dark:text-paper-100">
        {reminder.title}
      </p>
      <p className="mt-0.5 text-xs text-ink-400">
        {reminder.body ? `${reminder.body} · ` : ""}
        {formatWhen(reminder.fireAt)}
      </p>
    </div>
  );
}

/** Rendered on the client on purpose: the browser knows the person's timezone
 * without being told, and this is one of the few places where "whatever this
 * device thinks local is" is exactly the right answer. */
function formatWhen(iso: string): string {
  const at = new Date(iso);
  const minutesAgo = Math.round((Date.now() - at.getTime()) / 60_000);

  if (minutesAgo < 1) return "just now";
  if (minutesAgo < 60) return `${minutesAgo}m ago`;
  if (minutesAgo < 1440) return `${Math.round(minutesAgo / 60)}h ago`;

  return at.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
