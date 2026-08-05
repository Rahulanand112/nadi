import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api-error";
import { invitationService } from "@/server/services/invitation.service";

const acceptSchema = z.object({
  token: z.string().min(1),
  displayName: z.string().min(1).max(80),
});

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Not signed in.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = acceptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request.", code: "VALIDATION" }, { status: 422 });
  }

  try {
    const result = await invitationService.accept({
      token: parsed.data.token,
      userId: session.user.id,
      displayName: parsed.data.displayName,
    });
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error, "Invitation acceptance");
  }
}
