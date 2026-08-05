import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api-error";
import { habitService } from "@/server/services/habit.service";

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
