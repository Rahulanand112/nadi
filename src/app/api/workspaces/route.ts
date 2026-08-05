import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { workspaceService } from "@/server/services/workspace.service";
import { AppError, statusForCode } from "@/server/errors";

const createWorkspaceSchema = z.object({
  workspaceName: z.string().min(2).max(80),
  displayName: z.string().min(1).max(80),
});

/**
 * Creates a workspace owned by the currently signed-in user. Called once,
 * immediately after sign-up succeeds -- see the sign-up form for the two-step
 * flow (create account, then create workspace).
 */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return NextResponse.json({ error: "Not signed in.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createWorkspaceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", code: "VALIDATION", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    const workspace = await workspaceService.createForNewUser({
      workspaceName: parsed.data.workspaceName,
      ownerUserId: session.user.id,
      ownerDisplayName: parsed.data.displayName,
    });
    return NextResponse.json(workspace, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: statusForCode[error.code] },
      );
    }
    console.error("Workspace creation failed", error);
    return NextResponse.json({ error: "Something went wrong.", code: "INTERNAL" }, { status: 500 });
  }
}

/** Lists every workspace the signed-in user belongs to. */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return NextResponse.json({ error: "Not signed in.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const memberships = await workspaceService.listForUser(session.user.id);
  return NextResponse.json(memberships);
}
