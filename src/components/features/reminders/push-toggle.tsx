"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getPermission,
  isPushSupported,
  needsInstallFirst,
  urlBase64ToBuffer,
} from "@/lib/push";
import { isIos, isStandalone } from "@/lib/pwa";

type State =
  | "loading"
  | "unsupported"
  | "install-first"
  | "off"
  | "on"
  | "blocked"
  | "working";

/**
 * Turns phone notifications on for this device.
 *
 * More states than a toggle would suggest, because "off" has several causes
 * that need different things from the person, and collapsing them into one
 * disabled switch would leave somebody stuck with no idea why. On an iPhone
 * in a Safari tab the answer is "install the app first"; after a denied
 * permission prompt the answer is "change it in Settings, because the browser
 * will never ask again"; on Firefox the honest answer is that it will not
 * work here at all.
 *
 * Subscribing happens on a real tap and never automatically. iOS requires a
 * user gesture, and beyond that a permission prompt that appears unprompted
 * is the kind of thing people deny reflexively — and a denial is close to
 * permanent, since the browser will not re-ask.
 */
export function PushToggle({ vapidPublicKey }: { vapidPublicKey: string }) {
  const [state, setState] = useState<State>("loading");

  const refresh = useCallback(async () => {
    if (!isPushSupported()) {
      setState("unsupported");
      return;
    }

    if (needsInstallFirst(isIos(), isStandalone())) {
      setState("install-first");
      return;
    }

    const permission = getPermission();
    if (permission === "denied") {
      setState("blocked");
      return;
    }

    // Permission alone is not enough to call this "on": it can be granted
    // while the subscription never reached the server, or was pruned after
    // the endpoint expired. The registration is the source of truth.
    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      setState(existing && permission === "granted" ? "on" : "off");
    } catch {
      setState("off");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function enable() {
    setState("working");

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      // Reuse an existing subscription if the browser still has one — calling
      // subscribe twice with the same key returns the same endpoint anyway,
      // but going through getSubscription first avoids a needless round trip
      // to the vendor's push service.
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          // Required to be true by every browser: silent pushes that show no
          // notification are not permitted, so there is no other valid value.
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToBuffer(vapidPublicKey),
        }));

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      setState(response.ok ? "on" : "off");
    } catch {
      setState("off");
    }
  }

  async function disable() {
    setState("working");

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }

      setState("off");
    } catch {
      void refresh();
    }
  }

  if (state === "loading" || state === "unsupported") return null;

  return (
    <div className="border-t border-paper-200 px-3 py-2.5 dark:border-ink-800">
      {state === "install-first" ? (
        <p className="text-xs text-ink-400">
          Add Nadi to your Home Screen to get reminders on this phone.
        </p>
      ) : state === "blocked" ? (
        <p className="text-xs text-ink-400">
          Notifications are blocked for Nadi. You can turn them back on in your
          browser or phone settings.
        </p>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-ink-600 dark:text-ink-400">
            {state === "on" ? "Notifications on for this device" : "Get reminders on this device"}
          </span>

          <button
            onClick={() => (state === "on" ? void disable() : void enable())}
            disabled={state === "working"}
            className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition disabled:opacity-60 ${
              state === "on"
                ? "text-ink-500 hover:bg-paper-100 dark:hover:bg-ink-800"
                : "bg-iris-600 text-white hover:bg-iris-700"
            }`}
          >
            {state === "working" ? "…" : state === "on" ? "Turn off" : "Turn on"}
          </button>
        </div>
      )}
    </div>
  );
}
