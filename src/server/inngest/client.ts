import { Inngest } from "inngest";

/**
 * The Inngest client.
 *
 * Nadi's first piece of background infrastructure. Everything shipped before
 * v0.3 ran inside a request: somebody loaded a page, the server computed an
 * answer, the answer went back. A reminder has no such request — it has to
 * happen at a time when nobody is looking — and a serverless function cannot
 * wake itself up. Inngest is the thing that calls us.
 *
 * The keys are read from the environment automatically (INNGEST_EVENT_KEY and
 * INNGEST_SIGNING_KEY) and are validated at boot in src/lib/env.ts, so a
 * missing key fails loudly at startup rather than as reminders that quietly
 * never arrive.
 *
 * Note this file imports nothing from next or react: it belongs to the server
 * layer and stays portable, which matters because the plan is for this backend
 * to eventually run somewhere other than Vercel. The Next-specific handler
 * lives in the app layer, at src/app/api/inngest/route.ts.
 */
export const inngest = new Inngest({ id: "nadi" });
