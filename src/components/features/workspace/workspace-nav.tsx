"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

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
  const [isSwitcherOpen, setSwitcherOpen] = useState(false);
  const hasMultiple = workspaces.length > 1;

  return (
    <header className="border-b border-paper-200 dark:border-ink-800">
      <nav className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
        <div className="relative">
          <button
            onClick={() => hasMultiple && setSwitcherOpen((open) => !open)}
            className="flex items-center gap-1.5 text-sm font-medium text-ink-900 dark:text-paper-100"
            aria-expanded={isSwitcherOpen}
            aria-haspopup={hasMultiple ? "menu" : undefined}
            disabled={!hasMultiple}
          >
            {currentName}
            {hasMultiple ? (
              <span aria-hidden="true" className="text-ink-400">
                ▾
              </span>
            ) : null}
          </button>

          {isSwitcherOpen ? (
            <ul
              role="menu"
              className="absolute left-0 top-full z-10 mt-1 min-w-48 rounded-lg border border-paper-200 bg-paper-0 py-1 shadow-lg dark:border-ink-800 dark:bg-ink-900"
            >
              {workspaces.map((workspace) => (
                <li key={workspace.slug} role="none">
                  <button
                    role="menuitem"
                    onClick={() => {
                      setSwitcherOpen(false);
                      router.push(`/w/${workspace.slug}/dashboard`);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-paper-100 dark:hover:bg-ink-800 ${
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
          ) : null}
        </div>

        <div className="flex items-center gap-4 text-sm">
          <a
            href={`/w/${currentSlug}/dashboard`}
            className="text-ink-600 hover:text-ink-900 dark:text-ink-400 dark:hover:text-paper-100"
          >
            Dashboard
          </a>
          {isOwner ? (
            <a
              href={`/w/${currentSlug}/members`}
              className="text-ink-600 hover:text-ink-900 dark:text-ink-400 dark:hover:text-paper-100"
            >
              Members
            </a>
          ) : null}
          <button
            onClick={async () => {
              await signOut();
              router.push("/login");
              router.refresh();
            }}
            className="text-ink-400 hover:text-ink-600"
          >
            Sign out
          </button>
        </div>
      </nav>
    </header>
  );
}
