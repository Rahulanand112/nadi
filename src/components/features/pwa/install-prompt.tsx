"use client";

import { useEffect, useState } from "react";
import { isIos, isPromptSnoozed, isStandalone, snoozeInstallPrompt } from "@/lib/pwa";

/** Chrome's own type isn't in the DOM lib, since the event is
 * non-standard -- every other browser either does not fire it or fires
 * something incompatible. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * The install banner.
 *
 * Two genuinely different install paths live behind one component, because
 * from the person's point of view they are the same request ("put this on my
 * phone") even though the mechanics are opposites: Android can be triggered
 * programmatically, iOS can only be explained. Splitting them into separate
 * components would double the places a designer or future-me has to keep
 * the wording and timing consistent.
 *
 * Deliberately does not appear until `beforeinstallprompt` has actually
 * fired (Android) or iOS is detected. There is no reliable third path -- a
 * browser that supports neither gets no banner, which is correct: showing
 * install instructions for a mechanism that does not exist there would be
 * actively misleading rather than merely unhelpful.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandalone() || isPromptSnoozed()) return;

    if (isIos()) {
      setShowIosInstructions(true);
      return;
    }

    // Chrome does not fire this until it decides the page is "install
    // worthy" by its own heuristics (a manifest, a service worker, some
    // engagement) -- there is no way to force it sooner, so the banner
    // simply does not exist until the browser volunteers the event.
    function onPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    snoozeInstallPrompt();
    setDismissed(true);
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    // The prompt can only be used once; whatever the person chose, there is
    // nothing left to trigger a second time.
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  if (dismissed) return null;
  if (!deferredPrompt && !showIosInstructions) return null;

  return (
    <div className="fixed inset-x-4 bottom-20 z-30 mx-auto max-w-sm rounded-card border border-paper-200 bg-paper-0 p-4 shadow-lg dark:border-ink-800 dark:bg-ink-900">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- a static
            40px icon from /public has no need for Next's optimization
            pipeline (resizing, remote loading, lazy-load) that next/image
            exists for; a plain img is simpler and equally fast here. */}
        <img src="/icons/icon-192.png" alt="" className="size-10 shrink-0 rounded-lg" />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink-900 dark:text-paper-100">
            Install Nadi
          </p>

          {showIosInstructions ? (
            <p className="mt-0.5 text-xs text-ink-600 dark:text-ink-400">
              Tap{" "}
              <span aria-label="Share">
                <ShareIcon />
              </span>{" "}
              then &ldquo;Add to Home Screen&rdquo; for quick access and reminders.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-ink-600 dark:text-ink-400">
              Add Nadi to your home screen for quick access and reminders.
            </p>
          )}
        </div>

        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-lg p-1 text-ink-400 hover:bg-paper-100 dark:hover:bg-ink-800"
        >
          <svg viewBox="0 0 20 20" className="size-4" fill="currentColor" aria-hidden="true">
            <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {!showIosInstructions ? (
        <button
          onClick={install}
          className="mt-3 w-full rounded-lg bg-iris-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-iris-700"
        >
          Install
        </button>
      ) : null}
    </div>
  );
}

/** iOS's own share-sheet glyph, redrawn as an inline SVG. Naming the actual
 * icon rather than just saying "the share button" matters here: on iOS this
 * exact square-with-arrow is what a person is scanning the screen for. */
function ShareIcon() {
  return (
    <svg viewBox="0 0 20 20" className="inline size-3.5 -translate-y-px" fill="none" aria-hidden="true">
      <path
        d="M10 2.5v9M7 5.5l3-3 3 3M4 9v7a1 1 0 001 1h10a1 1 0 001-1V9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
