import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api-error";
import { pushService } from "@/server/services/push.service";

export const runtime = "nodejs";

/** The shape `PushSubscription.toJSON()` produces in the browser. Validated
 * rather than trusted because it arrives from the client like any other body,
 * even though the browser generated it. */
const subscribeSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({
    p256dh: z.string().min(1).max(255),
    auth: z.string().min(1).max(255),
  }),
});

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Not signed in.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const parsed = subscribeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "That subscription doesn't look valid.", code: "VALIDATION" },
      { status: 422 },
    );
  }

  try {
    await pushService.subscribe({
      userId: session.user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, "Push subscribe");
  }
}

/** How many devices this person has registered. Drives the UI's "notifications
 * are on" state, which cannot be read from the browser alone: permission being
 * granted here says nothing about whether the server ever received the
 * subscription. */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Not signed in.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const devices = await pushService.listDeviceCount(session.user.id);
    return NextResponse.json({ devices });
  } catch (error) {
    return toErrorResponse(error, "Push status");
  }
}
