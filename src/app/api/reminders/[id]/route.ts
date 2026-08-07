import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api-error";
import { reminderService } from "@/server/services/reminder.service";

/** Marks a single reminder read. Ownership is checked in the service, not
 * here — the app layer knows nothing about who may touch what. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Not signed in.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await reminderService.markRead({ reminderId: id, userId: session.user.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error, "Reminder dismissal");
  }
}
