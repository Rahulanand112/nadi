import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api-error";
import { reminderService } from "@/server/services/reminder.service";
import { requireWorkspaceAccess } from "@/server/services/workspace.service";

/** The notifications for whoever is signed in, in this workspace. Scoped by
 * membership rather than user: the same person in two households must not see
 * one household's reminders while looking at the other. */
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

    const result = await reminderService.list({
      workspaceId: workspace.id,
      userId: session.user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error, "Reminder listing");
  }
}

/** Marks everything read. */
export async function PATCH(
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

    await reminderService.markAllRead({
      workspaceId: workspace.id,
      userId: session.user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error, "Reminder dismissal");
  }
}
