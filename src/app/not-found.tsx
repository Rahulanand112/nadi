export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-400">
        Nadi
      </p>
      <h1 className="mt-3 font-display text-3xl text-ink-900 dark:text-paper-50">
        Nothing here
      </h1>
      <p className="mt-2 text-sm text-ink-600 dark:text-ink-400">
        This page doesn&rsquo;t exist, or it belongs to a workspace you&rsquo;re
        not a member of.
      </p>
      <a
        href="/dashboard"
        className="mt-6 self-start rounded-lg bg-iris-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-iris-700"
      >
        Back to your tasks
      </a>
    </main>
  );
}
