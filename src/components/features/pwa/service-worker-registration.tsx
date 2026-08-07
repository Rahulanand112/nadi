"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js.
 *
 * Renders nothing. Placed once in the root layout rather than a specific
 * page, because installability is a property of the whole app, not one
 * route -- registering it only on, say, the dashboard would mean a person
 * who lands directly on /login never gets a service worker at all.
 *
 * Guarded by a feature check because Safari on iOS below 16.4 and a handful
 * of embedded webviews (in-app browsers) have no serviceWorker API. Without
 * the guard those visitors would hit a ReferenceError on every page load.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Silent by design. A failed registration means no install prompt and
      // no push later, which is a degraded experience, not a broken one --
      // the task list and habits work identically either way. Not worth an
      // error toast on every page load for something the person cannot act
      // on from inside the app.
    });
  }, []);

  return null;
}
