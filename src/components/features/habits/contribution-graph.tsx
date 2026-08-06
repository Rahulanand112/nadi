"use client";

import { useMemo, useState } from "react";
import { buildContributionGrid } from "@/lib/streak";

const LEVEL_CLASSES = [
  "bg-paper-100 dark:bg-ink-800",
  "bg-status-done/25",
  "bg-status-done/50",
  "bg-status-done/75",
  "bg-status-done",
];

export function ContributionGraph({
  counts,
  weeks = 26,
}: {
  counts: [string, number][];
  weeks?: number;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const grid = useMemo(
    () => buildContributionGrid(new Map(counts), weeks),
    [counts, weeks],
  );

  const total = useMemo(
    () => counts.reduce((sum, [, count]) => sum + count, 0),
    [counts],
  );

  const hoveredCell = hovered
    ? grid.flat().find((cell) => cell.key === hovered)
    : null;

  return (
    <section className="rounded-card border border-paper-200 bg-paper-0 p-4 dark:border-ink-800 dark:bg-ink-900">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xs uppercase tracking-widest text-ink-400">
          Consistency
        </h2>
        <p className="text-xs text-ink-400">
          {hoveredCell ? (
            <>
              <span data-numeric>{hoveredCell.count}</span>
              {hoveredCell.count === 1 ? " habit on " : " habits on "}
              {hoveredCell.date.toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
              })}
            </>
          ) : (
            <>
              <span data-numeric>{total}</span> in the last{" "}
              <span data-numeric>{weeks}</span> weeks
            </>
          )}
        </p>
      </div>

      {/* Horizontally scrollable on narrow screens rather than squashed —
          squares below about 8px stop being readable. */}
      <div className="mt-3 overflow-x-auto pb-1">
        <div className="flex gap-[3px]" style={{ minWidth: "min-content" }}>
          {grid.map((column, index) => (
            <div key={index} className="flex flex-col gap-[3px]">
              {column.map((cell) => (
                <span
                  key={cell.key}
                  onMouseEnter={() => setHovered(cell.key)}
                  onMouseLeave={() => setHovered(null)}
                  title={`${cell.date.toDateString()}: ${cell.count}`}
                  className={`size-[11px] rounded-[3px] ${LEVEL_CLASSES[cell.level]}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-end gap-1.5 text-[10px] text-ink-400">
        Less
        {LEVEL_CLASSES.map((className, index) => (
          <span key={index} className={`size-[11px] rounded-[3px] ${className}`} />
        ))}
        More
      </div>
    </section>
  );
}
