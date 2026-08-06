import type { TrendPoint } from "@/lib/analytics";

/**
 * Hand-rolled SVG rather than a charting library. Two series of eight points
 * doesn't justify ~50kB of dependency, and this way the bars inherit the
 * design tokens directly.
 */
export function TrendChart({ points }: { points: TrendPoint[] }) {
  const max = Math.max(1, ...points.map((point) => Math.max(point.completed, point.created)));

  return (
    <section className="rounded-card border border-paper-200 bg-paper-0 p-4 dark:border-ink-800 dark:bg-ink-900">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xs uppercase tracking-widest text-ink-400">
          Last 8 weeks
        </h2>
        <p className="flex items-center gap-3 text-xs text-ink-400">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm bg-status-done" /> Completed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm bg-paper-300 dark:bg-ink-600" /> Created
          </span>
        </p>
      </div>

      <div className="mt-4 flex gap-2">
        {points.map((point) => (
          <div key={point.label} className="flex flex-1 flex-col items-center gap-1">
            {/* Fixed pixel height rather than h-full: percentage heights need a
                resolved parent height to compute against, and a flex child
                without one silently collapses every bar to zero. */}
            <div className="flex h-28 w-full items-end justify-center gap-0.5">
              <Bar
                value={point.created}
                max={max}
                className="bg-paper-300 dark:bg-ink-600"
                label="created"
              />
              <Bar
                value={point.completed}
                max={max}
                className="bg-status-done"
                label="completed"
              />
            </div>
            <span className="text-[10px] text-ink-400" data-numeric>
              {point.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Bar({
  value,
  max,
  className,
  label,
}: {
  value: number;
  max: number;
  className: string;
  label: string;
}) {
  // A non-zero count always gets a visible sliver, so "one task" and "none"
  // never look identical on a chart scaled to a busy week.
  const percent = value === 0 ? 0 : Math.max(6, (value / max) * 100);

  return (
    <div
      className={`w-1/2 rounded-t-sm transition-all ${className}`}
      style={{ height: `${percent}%` }}
      title={`${value} ${label}`}
      aria-label={`${value} ${label}`}
    />
  );
}
