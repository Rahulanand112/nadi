import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api-error";
import { pushService } from "@/server/services/push.service";

export const runtime = "nodejs";

const unsubscribeSchema = z.object({
  endpoint: z.string().url().max(1000),
});

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Not signed in.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const parsed = unsubscribeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request.", code: "VALIDATION" }, { status: 422 });
  }

  try {
    // Deleted by endpoint alone rather than endpoint-plus-owner. The endpoint
    // is an opaque, unguessable URL issued by the browser vendor, so knowing
    // one is itself proof of holding the device — and scoping the delete to
    // the current user would strand rows on a shared device where somebody
    // else signed in after subscribing.
    await pushService.unsubscribe({ endpoint: parsed.data.endpoint });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error, "Push unsubscribe");
  }
}
