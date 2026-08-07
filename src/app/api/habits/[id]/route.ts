import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api-error";
import { habitService } from "@/server/services/habit.service";

const reminderSchema = z.object({
  remindAtMinutes: z.number().int().min(0).max(1439).nullish(),
  reminderEnabled: z.boolean().optional(),
  reminderOffsetMinutes: z.number().int().min(1).max(10080).optional(),
});

/** Changes a habit's reminder. Split from creation because a habit outlives
 * the routine that made it — the time you want reminding shifts, and rebuilding
 * the habit to change it would throw away the streak. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Not signed in.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const parsed = reminderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update.", code: "VALIDATION" }, { status: 422 });
  }

  try {
    const { id } = await params;
    const habit = await habitService.setReminder({
      habitId: id,
      userId: session.user.id,
      remindAtMinutes: parsed.data.remindAtMinutes,
      reminderEnabled: parsed.data.reminderEnabled,
      reminderOffsetMinutes: parsed.data.reminderOffsetMinutes,
    });
    return NextResponse.json(habit);
  } catch (error) {
    return toErrorResponse(error, "Habit reminder update");
  }
}

/** Archives rather than deletes — the completion history is the point of a
 * habit, and destroying it on a tidy-up would be unrecoverable. */
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
    await habitService.archive({ habitId: id, userId: session.user.id });
    return NextResponse.json({ archived: true });
  } catch (error) {
    return toErrorResponse(error, "Habit archive");
  }
}
