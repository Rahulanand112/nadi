/**
 * Browser-side push helpers.
 *
 * Pure functions and capability checks — no React, no server imports. The
 * awkward bits here are all consequences of the Push API being older than the
 * conventions the rest of the codebase uses: it wants a raw byte array where
 * everything else wants a string, and it reports capability through three
 * unrelated globals rather than one.
 */

/**
 * Converts a VAPID public key from base64url text into the raw bytes
 * `pushManager.subscribe` demands.
 *
 * The key travels as base64url (URL-safe: `-` and `_` instead of `+` and `/`,
 * padding stripped) because it lives in an environment variable and gets
 * embedded in a page. The Push API predates that convention and accepts only
 * binary, so the two swaps and the padding have to be undone by hand —
 * `atob` rejects the URL-safe alphabet outright.
 *
 * Returns an ArrayBuffer rather than the Uint8Array you might expect.
 * TypeScript 5.7 made typed arrays generic over their backing buffer, so a
 * plain `Uint8Array` is now `Uint8Array<ArrayBufferLike>` and no longer
 * unifies with the DOM's `BufferSource`, which `applicationServerKey`
 * requires. An ArrayBuffer is a BufferSource under every version, so handing
 * one back avoids the mismatch outright instead of silencing it with a cast.
 */
export function urlBase64ToBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const raw = window.atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) {
    view[i] = raw.charCodeAt(i);
  }
  return buffer;
}

/** Whether this browser can do web push at all. Three separate globals
 * because they arrived in three separate specs; a browser can have service
 * workers without PushManager (older Safari) or Notification without either. */
export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export type PushPermission = "granted" | "denied" | "default" | "unsupported";

export function getPermission(): PushPermission {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission as PushPermission;
}

/**
 * iOS-specific gate.
 *
 * Safari on iPhone refuses to register a push subscription unless the app was
 * launched from the Home Screen. In a normal Safari tab `pushManager.subscribe`
 * fails, so the UI has to detect this case and ask the person to install first
 * rather than offering a button that cannot work. There is no way around it
 * and no equivalent restriction on Android.
 */
export function needsInstallFirst(isIosDevice: boolean, standalone: boolean): boolean {
  return isIosDevice && !standalone;
}
