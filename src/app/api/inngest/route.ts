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
 * Thin by design, like every other route: parse nothing, decide nothing, hand
 * off to the server layer.
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
