import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/**
 * The current VAPID public key, as JSON.
 *
 * No auth required -- this is the same value already embedded in every
 * signed-in page's HTML (see w/[slug]/layout.tsx) to drive the subscribe
 * button, so it carries no more exposure than the page itself. It exists as
 * its own endpoint because the service worker's pushsubscriptionchange
 * handler needs to fetch this key at a moment when no page may be open to
 * hand it over any other way.
 */
export async function GET() {
  return NextResponse.json({ publicKey: env.NEXT_PUBLIC_VAPID_PUBLIC_KEY });
}
