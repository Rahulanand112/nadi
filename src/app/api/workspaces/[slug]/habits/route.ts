import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api-error";
import { habitService } from "@/server/services/habit.service";
import { requireWorkspaceAccess } from "@/server/services/workspace.service";

const createHabitSchema = z.object({
  name: z.string().min(1).max(80),
  icon: z.string().max(8).nullish(),
  targetPerWeek: z.number().int().min(1).max(7).default(7),
  membershipId: z.string().nullish(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Not signed in.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const parsed = createHabitSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the habit details.", code: "VALIDATION" }, { status: 422 });
  }

  try {
    const { slug } = await params;
    const { workspace } = await requireWorkspaceAccess(slug, session.user.id);

    const habit = await habitService.create({
      workspaceId: workspace.id,
      userId: session.user.id,
      name: parsed.data.name,
      icon: parsed.data.icon,
      targetPerWeek: parsed.data.targetPerWeek,
      membershipId: parsed.data.membershipId ?? undefined,
    });

    return NextResponse.json(habit, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, "Habit creation");
  }
}
