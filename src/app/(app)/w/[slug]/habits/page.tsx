import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireWorkspaceAccess } from "@/server/services/workspace.service";
import { membershipService } from "@/server/services/invitation.service";
import { habitService } from "@/server/services/habit.service";
import { toDayKey } from "@/lib/streak";
import { HabitBoard } from "@/components/features/habits/habit-board";
import { ContributionGraph } from "@/components/features/habits/contribution-graph";
import type { HabitDTO } from "@/types/habit";

export default async function HabitsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ scope?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const { slug } = await params;
  const { scope: scopeParam } = await searchParams;
  const scope = scopeParam === "everyone" ? "everyone" : "mine";

  const { workspace, membership } = await requireWorkspaceAccess(slug, session!.user.id);

  const [habits, members] = await Promise.all([
    habitService.list({ workspaceId: workspace.id, userId: session!.user.id, scope }),
    membershipService.list({ workspaceId: workspace.id, userId: session!.user.id }),
  ]);

  const dto: HabitDTO[] = habits.map((habit) => ({
    id: habit.id,
    name: habit.name,
    icon: habit.icon,
    targetPerWeek: habit.targetPerWeek,
    remindAtMinutes: habit.remindAtMinutes,
    reminderEnabled: habit.reminderEnabled,
    reminderOffsetMinutes: habit.reminderOffsetMinutes,
    membership: habit.membership,
    // The Date column is UTC midnight; formatting via toDayKey here would
    // shift it in negative-offset timezones, so read the UTC parts directly.
    completedDays: habit.completions.map((completion) =>
      completion.day.toISOString().slice(0, 10),
    ),
  }));

  const doneToday = dto.filter((habit) =>
    habit.completedDays.includes(toDayKey(new Date())),
  ).length;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 pb-28 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-3xl text-ink-900 dark:text-paper-50">
          Habits
        </h1>
        {dto.length > 0 ? (
          <p className="text-sm text-ink-400">
            <span data-numeric>{doneToday}</span> of{" "}
            <span data-numeric>{dto.length}</span> done today
          </p>
        ) : null}
      </div>

      <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">
        {scope === "mine" ? membership.displayName : workspace.name}
      </p>

      {dto.length > 0 ? (
        <div className="mt-6">
          <ContributionGraph
            counts={[
              ...dto
                .flatMap((habit) => habit.completedDays)
                .reduce((map, day) => map.set(day, (map.get(day) ?? 0) + 1), new Map<string, number>())
                .entries(),
            ]}
            weeks={20}
          />
        </div>
      ) : null}

      <HabitBoard
        slug={slug}
        habits={dto}
        members={members.map((m) => ({ id: m.id, displayName: m.displayName }))}
        myMembershipId={membership.id}
        scope={scope}
      />
    </main>
  );
}
