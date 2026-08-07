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
