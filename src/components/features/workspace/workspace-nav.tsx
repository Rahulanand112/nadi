"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/features/theme/theme-toggle";

type WorkspaceOption = { slug: string; name: string };

export function WorkspaceNav({
  currentSlug,
  currentName,
  isOwner,
  workspaces,
}: {
  currentSlug: string;
  currentName: string;
  isOwner: boolean;
  workspaces: WorkspaceOption[];
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

  return (
    <header className="sticky top-0 z-20 border-b border-paper-200 bg-paper-50/85 backdrop-blur dark:border-ink-800 dark:bg-ink-950/85">
      <nav className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
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

        <div className="flex items-center gap-1 text-sm">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <a
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={`rounded-lg px-2 py-1.5 transition sm:px-3 ${
                  isActive
                    ? "font-medium text-ink-900 dark:text-paper-100"
                    : "text-ink-600 hover:text-ink-900 dark:text-ink-400 dark:hover:text-paper-100"
                }`}
              >
                {link.label}
              </a>
            );
          })}

          <ThemeToggle />

          <button
            onClick={async () => {
              await signOut();
              router.push("/login");
              router.refresh();
            }}
            aria-label="Sign out"
            className="grid size-8 place-items-center rounded-lg text-ink-400 transition hover:bg-paper-100 hover:text-ink-600 dark:hover:bg-ink-900"
          >
            <svg viewBox="0 0 20 20" className="size-4" fill="currentColor" aria-hidden="true">
              <path d="M7 3a1 1 0 010 2H5v10h2a1 1 0 110 2H5a2 2 0 01-2-2V5a2 2 0 012-2h2zm5.3 2.3a1 1 0 011.4 0l3.5 3.5a1 1 0 010 1.4l-3.5 3.5a1 1 0 01-1.4-1.4l1.8-1.8H9a1 1 0 110-2h5.1l-1.8-1.8a1 1 0 010-1.4z" />
            </svg>
          </button>
        </div>
      </nav>
    </header>
  );
}
