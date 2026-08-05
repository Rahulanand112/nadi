"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AcceptInvite({
  token,
  workspaceName,
  defaultDisplayName,
}: {
  token: string;
  workspaceName: string;
  defaultDisplayName: string;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  async function join(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsJoining(true);

    const response = await fetch("/api/invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, displayName }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Could not join this workspace.");
      setIsJoining(false);
      return;
    }

    const { workspace } = await response.json();
    router.push(`/w/${workspace.slug}/dashboard`);
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-400">
        Nadi
      </p>
      <h1 className="mt-3 font-display text-3xl text-ink-900 dark:text-paper-50">
        Join {workspaceName}
      </h1>
      <p className="mt-2 text-sm text-ink-600 dark:text-ink-400">
        Choose how you&rsquo;ll appear to everyone else in this space.
      </p>

      <form onSubmit={join} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-ink-800 dark:text-paper-200">
            Your name here
          </span>
          <input
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-lg border border-paper-300 bg-paper-0 px-3 py-2 text-sm text-ink-900 outline-none focus:border-iris-600 dark:border-ink-800 dark:bg-ink-900 dark:text-paper-100"
          />
          <span className="mt-1 block text-xs text-ink-400">
            Can differ per workspace &mdash; &ldquo;Dad&rdquo; at home,
            &ldquo;R. Sharma&rdquo; at work.
          </span>
        </label>

        {error ? (
          <p className="rounded-lg bg-status-overdue-soft px-3 py-2 text-sm text-status-overdue">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isJoining}
          className="w-full rounded-lg bg-iris-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-iris-700 disabled:opacity-60"
        >
          {isJoining ? "Joining…" : `Join ${workspaceName}`}
        </button>
      </form>
    </main>
  );
}
