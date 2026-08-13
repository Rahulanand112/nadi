"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/features/theme/theme-toggle";
import { ReminderBell } from "@/components/features/reminders/reminder-bell";

type WorkspaceOption = { slug: string; name: string };

/**
 * The workspace navigation bar.
 *
 * Two rows below the `sm` breakpoint, one row above it — not a cosmetic
 * choice, a correctness one. Five nav links plus three icon buttons do not
 * fit beside a workspace name on a real phone width (~380-430px CSS
 * pixels), and the previous version put all of it in a single flex row with
 * no shrink handling. Flexbox does not overflow gracefully in that case: it
 * shrinks each item's box without shrinking the text inside it, so the text
 * overflows its own box and visually collides with its neighbour — which is
 * exactly what "RaTulsks" was. `flex-col` on mobile makes overlap
 * structurally impossible, since stacked rows cannot occupy the same space;
 * this is a stronger guarantee than tuning gaps and font sizes, which only
 * pushes the same failure to a slightly narrower phone.
 *
 * The five links live in their own horizontally-scrollable strip rather than
 * wrapping onto more rows, because a two-line "Tasks / Habits / Calendar"
 * wrap reads as broken, while a swipeable tab strip reads as intentional —
 * it is a pattern people already know from every native app with more tabs
 * than fit.
 */
export function WorkspaceNav({
  currentSlug,
  currentName,
  isOwner,
  workspaces,
  vapidPublicKey,
}: {
  currentSlug: string;
  currentName: string;
  isOwner: boolean;
  workspaces: WorkspaceOption[];
  vapidPublicKey: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSwitcherOpen, setSwitcherOpen] = useState(false);
  const hasMultiple = workspaces.length > 1;

  const links = [
    { href: `/w/${currentSlug}/dashboard`, label: "Tasks" },
    { href: `/w/${currentSlug}/habits`, label: "Habits" },
    { href: `/w/${currentSlug}/calendar`, label: "Calendar" },
    { href: `/w/${currentSlug}/insights`, label: "Insights" },
    ...(isOwner ? [{ href: `/w/${currentSlug}/members`, label: "Members" }] : []),
  ];

  // Rendered once, placed twice. On mobile it sits on the switcher's row
  // (icons need a home even before the link strip appears); at `sm` and up
  // it moves to the end of the link row, matching the original desktop
  // layout. `sm:hidden` / `hidden sm:flex` is what performs that move —
  // no duplicate state, no duplicate handlers, just two render sites for
  // the same JSX gated by breakpoint.
  const icons = (
    <>
      <ReminderBell slug={currentSlug} vapidPublicKey={vapidPublicKey} />
      <ThemeToggle />
      <button
        onClick={async () => {
          await signOut();
          router.push("/login");
          router.refresh();
        }}
        aria-label="Sign out"
        className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-400 transition hover:bg-paper-100 hover:text-ink-600 dark:hover:bg-ink-900"
      >
        <svg viewBox="0 0 20 20" className="size-4" fill="currentColor" aria-hidden="true">
          <path d="M7 3a1 1 0 010 2H5v10h2a1 1 0 110 2H5a2 2 0 01-2-2V5a2 2 0 012-2h2zm5.3 2.3a1 1 0 011.4 0l3.5 3.5a1 1 0 010 1.4l-3.5 3.5a1 1 0 01-1.4-1.4l1.8-1.8H9a1 1 0 110-2h5.1l-1.8-1.8a1 1 0 010-1.4z" />
        </svg>
      </button>
    </>
  );

  return (
    <header className="sticky top-0 z-20 border-b border-paper-200 bg-paper-50/85 backdrop-blur dark:border-ink-800 dark:bg-ink-950/85">
      <nav className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6 sm:py-3">
        {/* Row 1 on mobile, left half on desktop: workspace name plus,
            on mobile only, the icon cluster — otherwise a phone screen
            would show just "Rahul" alone above an empty stretch of bar. */}
        <div className="flex items-center justify-between gap-2 sm:justify-start">
          <div className="relative min-w-0">
            <button
              onClick={() => hasMultiple && setSwitcherOpen((open) => !open)}
              className="flex max-w-40 items-center gap-1.5 truncate text-sm font-medium text-ink-900 dark:text-paper-100 sm:max-w-none"
              aria-expanded={isSwitcherOpen}
              aria-haspopup={hasMultiple ? "menu" : undefined}
              disabled={!hasMultiple}
            >
              <span className="truncate">{currentName}</span>
              {hasMultiple ? (
                <span aria-hidden="true" className="shrink-0 text-ink-400">
                  ▾
                </span>
              ) : null}
            </button>

            {isSwitcherOpen ? (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setSwitcherOpen(false)}
                  aria-hidden="true"
                />
                <ul
                  role="menu"
                  className="absolute left-0 top-full z-20 mt-1 min-w-48 rounded-lg border border-paper-200 bg-paper-0 py-1 shadow-lg dark:border-ink-800 dark:bg-ink-900"
                >
                  {workspaces.map((workspace) => (
                    <li key={workspace.slug} role="none">
                      <button
                        role="menuitem"
                        onClick={() => {
                          setSwitcherOpen(false);
                          router.push(`/w/${workspace.slug}/dashboard`);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm transition hover:bg-paper-100 dark:hover:bg-ink-800 ${
                          workspace.slug === currentSlug
                            ? "font-medium text-iris-600"
                            : "text-ink-800 dark:text-paper-200"
                        }`}
                      >
                        {workspace.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:hidden">{icons}</div>
        </div>

        {/* Row 2 on mobile, right half on desktop: the link strip.
            overflow-x-auto rather than flex-wrap — a tab strip you can
            swipe reads as intentional; a "Tasks / Habits" line-wrap reads
            as broken. shrink-0 + whitespace-nowrap on each link is what
            makes the scroll the only way this row responds to a narrow
            width, instead of silently repeating the original bug at a
            smaller size. */}
        <div className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 text-sm sm:mx-0 sm:overflow-visible sm:px-0">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <a
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={`shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 transition sm:px-3 ${
                  isActive
                    ? "font-medium text-ink-900 dark:text-paper-100"
                    : "text-ink-600 hover:text-ink-900 dark:text-ink-400 dark:hover:text-paper-100"
                }`}
              >
                {link.label}
              </a>
            );
          })}

          <div className="hidden shrink-0 items-center gap-1 sm:flex">{icons}</div>
        </div>
      </nav>
    </header>
  );
}
