import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireWorkspaceAccess } from "@/server/services/workspace.service";
import { membershipService } from "@/server/services/invitation.service";
import { taskService } from "@/server/services/task.service";
import { deriveStatus } from "@/lib/task-status";
import { TaskBoard } from "@/components/features/tasks/task-board";
import type { TaskDTO } from "@/types/task";

export default async function WorkspaceDashboardPage({
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

  const [members, tasks] = await Promise.all([
    membershipService.list({ workspaceId: workspace.id, userId: session!.user.id }),
    taskService.list({ workspaceId: workspace.id, userId: session!.user.id, scope }),
  ]);

  const dto: TaskDTO[] = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    category: task.category,
    priority: task.priority,
    dueAt: task.dueAt?.toISOString() ?? null,
    isAllDay: task.isAllDay,
    completedAt: task.completedAt?.toISOString() ?? null,
    recurrence: task.recurrence,
    reminderEnabled: task.reminderEnabled,
    reminderOffsetMinutes: task.reminderOffsetMinutes,
    commentCount: task._count.comments,
    assignee: task.assignee ?? null,
    createdBy: task.createdBy,
  }));

  const open = dto.filter((task) => deriveStatus(task) !== "done").length;
  const overdue = dto.filter((task) => deriveStatus(task) === "overdue").length;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 pb-28">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="font-display text-3xl text-ink-900 dark:text-paper-50">
          {scope === "mine" ? "Your day" : workspace.name}
        </h1>
        <p className="shrink-0 text-sm text-ink-400">
          <span data-numeric>{open}</span> open
          {overdue > 0 ? (
            <>
              {" · "}
              <span className="text-status-overdue">
                <span data-numeric>{overdue}</span> overdue
              </span>
            </>
          ) : null}
        </p>
      </div>

      <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">
        {scope === "mine"
          ? `Signed in as ${membership.displayName}`
          : `${members.length} ${members.length === 1 ? "member" : "members"} in this workspace`}
      </p>

      <TaskBoard
        slug={slug}
        tasks={dto}
        members={members.map((m) => ({ id: m.id, displayName: m.displayName }))}
        myMembershipId={membership.id}
        initialScope={scope}
      />
    </main>
  );
}
