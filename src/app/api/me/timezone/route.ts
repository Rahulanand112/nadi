import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api-error";
import { userService } from "@/server/services/user.service";

const schema = z.object({ timezone: z.string().min(1).max(64) });

/**
 * Records which timezone the person is in.
 *
 * Called by the browser rather than guessed on the server, because the server
 * genuinely cannot know: Vercel runs on UTC, and an IP address is a poor
 * proxy for where somebody's phone thinks it is. The browser knows exactly,
 * so it tells us.
 */
export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Not signed in.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid timezone.", code: "VALIDATION" }, { status: 422 });
  }

  try {
    await userService.setTimezone({
      userId: session.user.id,
      timezone: parsed.data.timezone,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error, "Timezone update");
  }
}
