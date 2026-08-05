import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api-error";
import { taskService } from "@/server/services/task.service";

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullish(),
  category: z.string().max(60).nullish(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  dueAt: z.string().datetime().nullish(),
  isAllDay: z.boolean().optional(),
  assigneeId: z.string().nullish(),
  completed: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Not signed in.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const parsed = updateTaskSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update.", code: "VALIDATION" }, { status: 422 });
  }

  try {
    const { id } = await params;
    const { dueAt, ...rest } = parsed.data;

    const task = await taskService.update({
      taskId: id,
      userId: session.user.id,
      data: {
        ...rest,
        ...(dueAt === undefined ? {} : { dueAt: dueAt ? new Date(dueAt) : null }),
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    return toErrorResponse(error, "Task update");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Not signed in.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await taskService.remove({ taskId: id, userId: session.user.id });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return toErrorResponse(error, "Task deletion");
  }
}
