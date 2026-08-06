import { analyticsRepository } from "@/server/repositories/analytics.repository";
import { membershipRepository, workspaceRepository } from "@/server/repositories/workspace.repository";
import { computeStats, weeklyTrend, type Stats, type TrendPoint } from "@/lib/analytics";
import { currentStreak, toDayKey } from "@/lib/streak";
import { ForbiddenError } from "@/server/errors";

const WINDOW_DAYS = 90;

export type MemberStanding = {
  membershipId: string;
  displayName: string;
  stats: Stats;
  habitDaysThisWeek: number;
  bestHabitStreak: number;
};

export type WorkspaceInsights = {
  workspace: Stats;
  trend: TrendPoint[];
  standings: MemberStanding[];
  contributionCounts: [string, number][];
  mine: Stats;
};

export const analyticsService = {
  async forWorkspace(input: { workspaceId: string; userId: string }): Promise<WorkspaceInsights> {
    const membership = await workspaceRepository.findMembership(input.workspaceId, input.userId);
    if (!membership) throw new ForbiddenError("You are not a member of this workspace.");

    const since = new Date();
    since.setDate(since.getDate() - WINDOW_DAYS);

    const [facts, completions, members] = await Promise.all([
      analyticsRepository.taskFactsForWorkspace(input.workspaceId, since),
      analyticsRepository.habitCompletionCounts(input.workspaceId, since),
      membershipRepository.listForWorkspace(input.workspaceId),
    ]);

    // Habit completions per member, and per day across the whole workspace.
    const daysByMember = new Map<string, Set<string>>();
    const countsByDay = new Map<string, number>();

    for (const completion of completions) {
      const key = completion.day.toISOString().slice(0, 10);
      countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1);

      const memberId = completion.habit.membershipId;
      const set = daysByMember.get(memberId) ?? new Set<string>();
      set.add(key);
      daysByMember.set(memberId, set);
    }

    const weekKeys = new Set<string>();
    for (let offset = 0; offset < 7; offset += 1) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      weekKeys.add(toDayKey(date));
    }

    const standings: MemberStanding[] = members
      .map((member) => {
        const theirs = facts.filter((fact) => fact.assigneeId === member.id);
        const habitDays = daysByMember.get(member.id) ?? new Set<string>();

        return {
          membershipId: member.id,
          displayName: member.displayName,
          stats: computeStats(theirs),
          habitDaysThisWeek: [...weekKeys].filter((key) => habitDays.has(key)).length,
          bestHabitStreak: currentStreak(habitDays),
        };
      })
      // Rank by score, then by raw completions so a perfect score on two tasks
      // doesn't outrank a strong score on fifty.
      .sort((a, b) => b.stats.score - a.stats.score || b.stats.completed - a.stats.completed);

    return {
      workspace: computeStats(facts),
      trend: weeklyTrend(facts),
      standings,
      contributionCounts: [...countsByDay.entries()],
      mine: computeStats(facts.filter((fact) => fact.assigneeId === membership.id)),
    };
  },
};
