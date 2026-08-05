import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api-error";
import { membershipService } from "@/server/services/invitation.service";
import { requireWorkspaceAccess } from "@/server/services/workspace.service";

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
    const members = await membershipService.list({
      workspaceId: workspace.id,
      userId: session.user.id,
    });
    return NextResponse.json(members);
  } catch (error) {
    return toErrorResponse(error, "Member listing");
  }
}

export async function DELETE(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Not signed in.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const url = new URL(request.url);
  const membershipId = url.searchParams.get("membershipId");
  if (!membershipId) {
    return NextResponse.json({ error: "Missing membershipId.", code: "VALIDATION" }, { status: 422 });
  }

  try {
    await membershipService.remove({ membershipId, actorUserId: session.user.id });
    return NextResponse.json({ removed: true });
  } catch (error) {
    return toErrorResponse(error, "Member removal");
  }
}
