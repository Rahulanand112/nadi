import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api-error";
import { taskService } from "@/server/services/task.service";
import { requireWorkspaceAccess } from "@/server/services/workspace.service";

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullish(),
  category: z.string().max(60).nullish(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  dueAt: z.string().datetime().nullish(),
  isAllDay: z.boolean().default(false),
  assigneeId: z.string().nullish(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Not signed in.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const parsed = createTaskSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the task details and try again.", code: "VALIDATION" },
      { status: 422 },
    );
  }

  try {
    const { slug } = await params;
    const { workspace } = await requireWorkspaceAccess(slug, session.user.id);

    const task = await taskService.create({
      workspaceId: workspace.id,
      userId: session.user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      priority: parsed.data.priority,
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
      isAllDay: parsed.data.isAllDay,
      assigneeId: parsed.data.assigneeId,
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, "Task creation");
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Not signed in.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const { workspace } = await requireWorkspaceAccess(slug, session.user.id);
    const scope = new URL(request.url).searchParams.get("scope") === "mine" ? "mine" : "everyone";

    const tasks = await taskService.list({
      workspaceId: workspace.id,
      userId: session.user.id,
      scope,
    });
    return NextResponse.json(tasks);
  } catch (error) {
    return toErrorResponse(error, "Task listing");
  }
}
