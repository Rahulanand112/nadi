import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api-error";
import { invitationService } from "@/server/services/invitation.service";

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
    await invitationService.revoke({ invitationId: id, userId: session.user.id });
    return NextResponse.json({ revoked: true });
  } catch (error) {
    return toErrorResponse(error, "Invitation revocation");
  }
}
