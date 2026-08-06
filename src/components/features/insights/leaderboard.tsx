import type { MemberStanding } from "@/server/services/analytics.service";

const MEDALS = ["🥇", "🥈", "🥉"];

export function Leaderboard({
  standings,
  myMembershipId,
}: {
  standings: MemberStanding[];
  myMembershipId: string;
}) {
  const hasAnyActivity = standings.some((standing) => standing.stats.total > 0);

  return (
    <section className="rounded-card border border-paper-200 bg-paper-0 p-4 dark:border-ink-800 dark:bg-ink-900">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xs uppercase tracking-widest text-ink-400">
          Leaderboard
        </h2>
        <p className="text-xs text-ink-400">Last 90 days</p>
      </div>

      {hasAnyActivity ? (
        <ol className="mt-3 divide-y divide-paper-200 dark:divide-ink-800">
          {standings.map((standing, index) => {
            const isMe = standing.membershipId === myMembershipId;
            return (
              <li
                key={standing.membershipId}
                className="flex items-center gap-3 py-3"
              >
                <span
                  aria-hidden="true"
                  className="w-6 shrink-0 text-center text-sm"
                >
                  {MEDALS[index] ?? (
                    <span data-numeric className="text-ink-400">
                      {index + 1}
                    </span>
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink-900 dark:text-paper-100">
                    {standing.displayName}
                    {isMe ? (
                      <span className="ml-2 text-xs text-ink-400">you</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-ink-400">
                    <span data-numeric>{standing.stats.completed}</span> done
                    {standing.bestHabitStreak > 0 ? (
                      <>
                        {" · "}
                        <span data-numeric>{standing.bestHabitStreak}</span> day
                        habit streak
                      </>
                    ) : null}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p
                    data-numeric
                    className="text-lg leading-none text-ink-900 dark:text-paper-100"
                  >
                    {standing.stats.score}
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wider text-ink-400">
                    score
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-4 text-sm text-ink-400">
          Nobody has tasks yet. Rankings appear once there&rsquo;s something to
          measure.
        </p>
      )}

      <p className="mt-3 border-t border-paper-200 pt-3 text-[11px] leading-relaxed text-ink-400 dark:border-ink-800">
        Score weights finishing work (60%) above finishing it punctually (40%).
        Ties break on the number completed, so a perfect record on two tasks
        doesn&rsquo;t outrank a strong one on fifty.
      </p>
    </section>
  );
}
