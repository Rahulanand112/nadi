// Nadi's service worker.
//
// Deliberately minimal in this slice. A service worker is what makes the app
// installable at all -- iOS and Android both require one registered before
// "Add to Home Screen" does anything more than bookmark a URL -- so getting
// one running is the goal here, not caching strategy or offline support.
//
// The push event listener is the reason this file exists ahead of schedule:
// Slice 3 needs a service worker already registered and active on the
// person's device before a push subscription can be created. Adding it now,
// inert, means Slice 3 is "fill in this handler" rather than "get a new
// service worker adopted," which is a much slower thing to roll out because
// browsers only replace a service worker on the next visit after the old one
// has no open tabs.

const VERSION = "v1";

self.addEventListener("install", () => {
  // Activate immediately rather than waiting for every open tab to close.
  // With no caching yet there is nothing an old version is protecting the
  // person from, so there is no reason to make them wait.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// No fetch handler yet. Adding one that just passes requests through would
// add a network hop for no benefit; a real caching strategy is a v0.5
// performance slice, not part of making the app installable.

/**
 * Push handling.
 *
 * Inert until Slice 3 sends real payloads -- there is nothing to subscribe to
 * yet, so this never fires today. Left in place, rather than added later, so
 * that Slice 3 is a change to an already-active worker instead of a second
 * rollout with its own adoption delay.
 */
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Nadi", {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: payload.data ?? {},
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url ?? "/";
  event.waitUntil(self.clients.openWindow(target));
});

/**
 * Fires when the browser or push service invalidates this device's
 * subscription out from under the app -- most commonly a VAPID keypair
 * rotation, or the vendor rotating the endpoint on its own schedule. Without
 * this handler the old subscription just sits in the database forever,
 * failing every send with no path back (see push.service.ts's
 * DEAD_STATUS_CODES) until someone notices and manually toggles push off and
 * on in PushToggle.
 *
 * Support for `event.newSubscription` is inconsistent across browsers, so
 * this always re-subscribes by hand when it is absent rather than assuming a
 * particular vendor's behaviour.
 */
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(handleSubscriptionChange(event));
});

async function handleSubscriptionChange(event) {
  const oldEndpoint = event.oldSubscription?.endpoint ?? null;

  try {
    const subscription =
      event.newSubscription ??
      (await self.registration.pushManager.subscribe({
        // Required to be true by every browser; see push-toggle.tsx.
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBuffer(await fetchCurrentVapidPublicKey()),
      }));

    await postSubscription(subscription);

    if (oldEndpoint && oldEndpoint !== subscription.endpoint) {
      await deleteSubscription(oldEndpoint);
    }
  } catch (error) {
    // This can fire with no tab open and no user gesture available to retry
    // from, so there is nothing more useful to do than record the failure --
    // throwing here would just be an unhandled rejection with no one to see
    // it. The device falls back to the manual "turn off, turn on" path in
    // PushToggle until a later attempt succeeds.
    console.error("pushsubscriptionchange: resubscribe failed", error);
  }
}

async function fetchCurrentVapidPublicKey() {
  const response = await fetch("/api/push/vapid-key");
  if (!response.ok) {
    throw new Error(`Failed to fetch VAPID public key: ${response.status}`);
  }

  const { publicKey } = await response.json();
  if (!publicKey) {
    throw new Error("VAPID public key response had no publicKey");
  }

  return publicKey;
}

async function postSubscription(subscription) {
  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });

  if (!response.ok) {
    throw new Error(`Failed to save resubscribed device: ${response.status}`);
  }
}

async function deleteSubscription(endpoint) {
  await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });
}

// Same base64url decode as src/lib/push.ts's urlBase64ToBuffer -- duplicated
// rather than imported because a service worker cannot import from the app's
// module graph.
function urlBase64ToBuffer(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) {
    view[i] = raw.charCodeAt(i);
  }
  return buffer;
}
