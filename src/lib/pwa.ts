/**
 * Platform detection for the install prompt.
 *
 * Exists because "Add to Home Screen" has no single API. Android/Chrome
 * fires a `beforeinstallprompt` event the app can intercept and trigger on
 * demand. iOS Safari fires nothing at all -- there is no programmatic
 * install on iOS, only a manual Share -> Add to Home Screen path, so the
 * best the app can do is detect iOS and show instructions for that path.
 *
 * User-agent sniffing is normally something to avoid, but there is no
 * feature-detection alternative here: `beforeinstallprompt` support is not
 * something a UA-agnostic check can discover, and Apple has never shipped an
 * equivalent event.
 */

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/** True once the app is already running as an installed PWA -- either iOS's
 * `navigator.standalone` or the standard `display-mode: standalone` media
 * query, which is what Android/desktop Chrome set. Checking both is
 * necessary because neither alone covers every platform. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;

  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone;
  if (iosStandalone) return true;

  return window.matchMedia?.("(display-mode: standalone)").matches ?? false;
}

const DISMISS_KEY = "nadi:install-prompt-dismissed-at";

/** Once dismissed, the banner stays hidden for a while rather than forever.
 * Forever would bury the prompt for someone who dismissed it by reflex
 * before they understood what it offered; a period gives them a second
 * look without nagging every single visit in between. */
const SNOOZE_DAYS = 14;

export function isPromptSnoozed(): boolean {
  if (typeof window === "undefined") return false;

  const raw = window.localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;

  const dismissedAt = Number(raw);
  if (!Number.isFinite(dismissedAt)) return false;

  const elapsedDays = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
  return elapsedDays < SNOOZE_DAYS;
}

export function snoozeInstallPrompt(): void {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Private browsing / storage disabled. Worst case the banner reappears
    // next visit, which is a mild annoyance, not a broken feature.
  }
}
