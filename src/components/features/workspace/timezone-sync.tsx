"use client";

import { useEffect } from "react";

/**
 * Tells the server which timezone this browser is in.
 *
 * Renders nothing. It exists because habit reminders are wall-clock times —
 * "remind me at 7am" means 7am where the person is — and the server has no way
 * to know that on its own: Vercel runs on UTC and an IP address is a poor
 * guess for where somebody's phone thinks it is. The browser knows exactly.
 *
 * Sent on every workspace load rather than only at sign-up, because people
 * travel and phones follow them. The service skips the write when the value is
 * unchanged, so the normal case costs one read and nothing else.
 */
export function TimezoneSync({ current }: { current: string }) {
  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!detected || detected === current) return;

    void fetch("/api/me/timezone", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone: detected }),
    }).catch(() => {
      // Silent by design. If this fails, habit reminders fall back to the
      // stored zone, which is stale rather than broken — not worth interrupting
      // somebody's task list to tell them about.
    });
  }, [current]);

  return null;
}
