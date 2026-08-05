import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api-error";
import { invitationService } from "@/server/services/invitation.service";
import { requireWorkspaceAccess } from "@/server/services/workspace.service";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["OWNER", "MEMBER"]).default("MEMBER"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Not signed in.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid email address.", code: "VALIDATION" },
      { status: 422 },
    );
  }

  try {
    const { slug } = await params;
    const { workspace } = await requireWorkspaceAccess(slug, session.user.id);

    const invitation = await invitationService.create({
      workspaceId: workspace.id,
      email: parsed.data.email,
      role: parsed.data.role,
      invitedByUserId: session.user.id,
    });

    return NextResponse.json(invitation, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, "Invitation creation");
  }
}

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
    const invitations = await invitationService.listPending({
      workspaceId: workspace.id,
      userId: session.user.id,
    });
    return NextResponse.json(invitations);
  } catch (error) {
    return toErrorResponse(error, "Invitation listing");
  }
}
