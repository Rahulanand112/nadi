import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireWorkspaceAccess } from "@/server/services/workspace.service";
import { taskService } from "@/server/services/task.service";
import { CalendarView } from "@/components/features/calendar/calendar-view";
import type { TaskDTO } from "@/types/task";

export default async function CalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ scope?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const { slug } = await params;
  const { scope: scopeParam } = await searchParams;
  const scope = scopeParam === "mine" ? "mine" : "everyone";

  const { workspace } = await requireWorkspaceAccess(slug, session!.user.id);
  const tasks = await taskService.list({
    workspaceId: workspace.id,
    userId: session!.user.id,
    scope,
  });

  const dto: TaskDTO[] = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    category: task.category,
    priority: task.priority,
    dueAt: task.dueAt?.toISOString() ?? null,
    isAllDay: task.isAllDay,
    completedAt: task.completedAt?.toISOString() ?? null,
    assignee: task.assignee ?? null,
    createdBy: task.createdBy,
  }));

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-3xl text-ink-900 dark:text-paper-50">
          Calendar
        </h1>
        <div className="flex items-center gap-1 text-sm">
          <a
            href={`/w/${slug}/calendar?scope=mine`}
            className={scope === "mine" ? "font-medium text-iris-600" : "text-ink-400"}
          >
            Mine
          </a>
          <span className="text-paper-300">/</span>
          <a
            href={`/w/${slug}/calendar?scope=everyone`}
            className={scope === "everyone" ? "font-medium text-iris-600" : "text-ink-400"}
          >
            Everyone
          </a>
        </div>
      </div>

      <CalendarView tasks={dto} showAssignee={scope === "everyone"} />
    </main>
  );
}
