import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api-error";
import { commentService } from "@/server/services/comment.service";

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
    // Who may delete is decided in the service, not here -- the app layer
    // knows nothing about authorship or roles.
    await commentService.remove({ commentId: id, userId: session.user.id });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return toErrorResponse(error, "Comment deletion");
  }
}
