import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api-error";
import { habitService } from "@/server/services/habit.service";

const toggleSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  done: z.boolean(),
});

/** Marks a habit done (or not done) for a given day. The client sends its own
 * local day key so the record matches the day the person actually means. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Not signed in.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const parsed = toggleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request.", code: "VALIDATION" }, { status: 422 });
  }

  try {
    const { id } = await params;
    await habitService.toggleDay({
      habitId: id,
      userId: session.user.id,
      dayKey: parsed.data.day,
      done: parsed.data.done,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error, "Habit toggle");
  }
}
