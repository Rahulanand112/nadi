import { serve } from "inngest/next";
import { inngest } from "@/server/inngest/client";
import { functions } from "@/server/inngest/functions";

/**
 * Where Inngest reaches Nadi.
 *
 * Inngest does not run our code on its own servers. It calls this endpoint
 * when a job is due, which is why the app has to be deployed and reachable for
 * reminders to work at all, and why this route must stay public — the request
 * arrives from Inngest, not from a signed-in browser. It is not unprotected:
 * the signing key verifies that the caller really is Inngest.
 *
 * Pinned to the Node runtime because the push library reaches for Node's
 * crypto and https modules to sign and send VAPID requests. On the Edge
 * runtime those do not exist, and the failure would appear as pushes silently
 * never arriving rather than as a build error.
 */
export const runtime = "nodejs";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
