"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production this is where an error reporter (Sentry et al.) would go.
    console.error("Unhandled error", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <p className="font-mono text-xs uppercase tracking-widest text-status-overdue">
        Something broke
      </p>
      <h1 className="mt-3 font-display text-3xl text-ink-900 dark:text-paper-50">
        That didn&rsquo;t work
      </h1>
      <p className="mt-2 text-sm text-ink-600 dark:text-ink-400">
        The error has been logged. You can try again, or head back to your tasks.
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-xs text-ink-400">Reference: {error.digest}</p>
      ) : null}
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-iris-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-iris-700"
        >
          Try again
        </button>
        <a
          href="/dashboard"
          className="rounded-lg border border-paper-300 px-4 py-2 text-sm font-medium text-ink-800 transition hover:bg-paper-100 dark:border-ink-800 dark:text-paper-200 dark:hover:bg-ink-900"
        >
          Back to tasks
        </a>
      </div>
    </main>
  );
}
