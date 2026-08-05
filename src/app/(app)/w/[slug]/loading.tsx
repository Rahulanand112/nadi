/** Skeleton shown while a workspace page's data resolves. Matching the real
 * layout's shape stops the content jumping when it arrives. */
export default function WorkspaceLoading() {
  return (
    <main className="mx-auto max-w-3xl animate-pulse px-4 py-10 sm:px-6" aria-busy="true">
      <span className="sr-only">Loading</span>
      <div className="h-9 w-48 rounded-lg bg-paper-200 dark:bg-ink-800" />
      <div className="mt-2 h-4 w-32 rounded bg-paper-200 dark:bg-ink-800" />
      <div className="mt-6 h-10 rounded-lg bg-paper-200 dark:bg-ink-800" />
      <div className="mt-4 space-y-2">
        {[0, 1, 2].map((row) => (
          <div key={row} className="h-20 rounded-card bg-paper-200 dark:bg-ink-800" />
        ))}
      </div>
    </main>
  );
}
