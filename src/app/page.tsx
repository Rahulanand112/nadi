import { healthService, type HealthStatus } from "@/server/services/health.service";

export const dynamic = "force-dynamic";

const STATUS_SWATCHES = [
  { label: "Completed", token: "bg-status-done", soft: "bg-status-done-soft" },
  { label: "Upcoming", token: "bg-status-upcoming", soft: "bg-status-upcoming-soft" },
  { label: "Overdue", token: "bg-status-overdue", soft: "bg-status-overdue-soft" },
] as const;

export default async function Home() {
  let status: HealthStatus | null = null;
  let failure: string | null = null;

  try {
    status = await healthService.check();
  } catch (error) {
    failure =
      error instanceof Error
        ? error.message
        : "The database did not respond.";
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-400">
        Nadi &middot; v0.1.0-alpha.1 &middot; Slice 1
      </p>

      <h1 className="mt-3 font-display text-4xl leading-tight text-ink-900 dark:text-paper-50">
        Foundation is live.
      </h1>

      <p className="mt-3 max-w-md text-ink-600 dark:text-ink-400">
        Nothing here yet but the plumbing &mdash; and that is the point. This
        page reads a row from Postgres through the service layer, so the whole
        chain is proven before a single feature is built on top of it.
      </p>

      <section
        aria-label="System check"
        className="mt-10 rounded-card border border-paper-200 bg-paper-0 p-6 dark:border-ink-800 dark:bg-ink-900"
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={`size-2.5 rounded-full ${
              failure ? "bg-status-overdue" : "bg-status-done"
            }`}
          />
          <span className="text-sm font-medium text-ink-900 dark:text-paper-100">
            {failure ? "Database unreachable" : "Database connected"}
          </span>
        </div>

        {status ? (
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-400">Record</dt>
              <dd className="text-ink-800 dark:text-paper-200">
                {status.message}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-400">Written at</dt>
              <dd>
                <time
                  dateTime={status.checkedAt.toISOString()}
                  className="font-mono text-xs text-ink-800 dark:text-paper-200"
                >
                  {status.checkedAt.toISOString()}
                </time>
              </dd>
            </div>
          </dl>
        ) : (
          <div className="mt-5 text-sm">
            <p className="text-ink-800 dark:text-paper-200">{failure}</p>
            <p className="mt-2 text-ink-400">
              Check that DATABASE_URL is set and that you have run{" "}
              <code className="font-mono text-xs">npm run db:migrate</code>.
            </p>
          </div>
        )}
      </section>

      <section aria-label="Status colours" className="mt-8">
        <h2 className="text-xs uppercase tracking-widest text-ink-400">
          Task status palette
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {STATUS_SWATCHES.map((swatch) => (
            <li
              key={swatch.label}
              className={`flex items-center gap-2 rounded-full ${swatch.soft} px-3 py-1.5 text-xs font-medium text-ink-800`}
            >
              <span
                aria-hidden="true"
                className={`size-2 rounded-full ${swatch.token}`}
              />
              {swatch.label}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
