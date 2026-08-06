import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireWorkspaceAccess } from "@/server/services/workspace.service";
import { analyticsService } from "@/server/services/analytics.service";
import { ScoreCard } from "@/components/features/insights/score-card";
import { TrendChart } from "@/components/features/insights/trend-chart";
import { Leaderboard } from "@/components/features/insights/leaderboard";
import { ContributionGraph } from "@/components/features/habits/contribution-graph";

export default async function InsightsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const { slug } = await params;
  const { workspace, membership } = await requireWorkspaceAccess(slug, session!.user.id);

  const insights = await analyticsService.forWorkspace({
    workspaceId: workspace.id,
    userId: session!.user.id,
  });

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-10 sm:px-6">
      <div>
        <h1 className="font-display text-3xl text-ink-900 dark:text-paper-50">
          Insights
        </h1>
        <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">
          {workspace.name} &middot; last 90 days
        </p>
      </div>

      <ScoreCard stats={insights.mine} label={`${membership.displayName}'s score`} />
      <ScoreCard stats={insights.workspace} label="Whole workspace" />

      <TrendChart points={insights.trend} />

      <ContributionGraph counts={insights.contributionCounts} />

      <Leaderboard
        standings={insights.standings}
        myMembershipId={membership.id}
      />
    </main>
  );
}
