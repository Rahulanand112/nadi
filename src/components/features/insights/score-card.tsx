import { formatDelay, type Stats } from "@/lib/analytics";

/** A ring rather than a bar: a score is a single proportion of a whole, and a
 * ring reads as "out of 100" without needing an axis. */
export function ScoreCard({ stats, label }: { stats: Stats; label: string }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - stats.score / 100);

  const tone =
    stats.score >= 70
      ? "text-status-done"
      : stats.score >= 40
        ? "text-status-upcoming"
        : "text-status-overdue";

  return (
    <section className="rounded-card border border-paper-200 bg-paper-0 p-5 dark:border-ink-800 dark:bg-ink-900">
      <h2 className="text-xs uppercase tracking-widest text-ink-400">{label}</h2>

      <div className="mt-4 flex items-center gap-5">
        <div className="relative shrink-0">
          <svg viewBox="0 0 100 100" className="size-24 -rotate-90">
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              strokeWidth="8"
              className="stroke-paper-100 dark:stroke-ink-800"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className={`${tone} stroke-current transition-all`}
            />
          </svg>
          <span
            data-numeric
            className="absolute inset-0 grid place-items-center text-2xl font-medium text-ink-900 dark:text-paper-50"
          >
            {stats.score}
          </span>
        </div>

        <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <Metric
            label="Completed"
            value={`${stats.completed} of ${stats.total}`}
          />
          <Metric
            label="On time"
            value={
              stats.completed === 0
                ? "—"
                : `${Math.round(stats.onTimeRate * 100)}%`
            }
          />
          <Metric
            label="Overdue now"
            value={String(stats.overdue)}
            tone={stats.overdue > 0 ? "text-status-overdue" : undefined}
          />
          <Metric label="Avg. delay" value={formatDelay(stats.averageDelayHours)} />
        </dl>
      </div>

      {stats.total === 0 ? (
        <p className="mt-4 text-xs text-ink-400">
          No tasks in the last 90 days — the score has nothing to measure yet.
        </p>
      ) : null}
    </section>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-ink-400">{label}</dt>
      <dd
        data-numeric
        className={`mt-0.5 ${tone ?? "text-ink-900 dark:text-paper-100"}`}
      >
        {value}
      </dd>
    </div>
  );
}
