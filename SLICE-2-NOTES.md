# v0.3 — Slice 2: PWA shell

**What this does:** makes Nadi installable to your phone's home screen, on both
Android and iPhone. It does not send any notifications yet — that's Slice 3.

**Pass/fail for this slice:** you install Nadi from your phone's browser, and it
opens full-screen with no browser address bar, with its own icon.

---

## Step 1 — Extract over your project

```powershell
cd C:\Users\admin\Downloads\ai-productivity
Expand-Archive -Path $HOME\Downloads\nadi-v0.3-slice2.zip -DestinationPath . -Force
```

No new dependencies this time — no `npm install` needed.

## Step 2 — Check it compiles

```powershell
npm run verify
```

Should pass clean, same as last time. If not, paste me the full output.

## Step 3 — Look at the icon

Open `public/icons/icon-512.png` in File Explorer to see the placeholder icon —
a simple double-wave mark in Nadi's iris colour. It's a placeholder. When you
have a real logo, send it to me and I'll regenerate every size from it — there
are 7 files and getting all the dimensions and formats right by hand is exactly
the kind of thing worth doing once, programmatically, rather than sizing each
one manually in an image editor.

## Step 4 — Test on desktop first

```powershell
npm run dev
```

Open `http://localhost:3000` in **Chrome** (not Firefox — Firefox doesn't
support installable PWAs the same way). Look at the address bar — there should
be a small install icon (usually a monitor-with-arrow icon) on the right side.
Click it, then **Install**. Nadi should open in its own window with no address
bar. Screenshot this.

This desktop check exists mainly to confirm the manifest and service worker are
wired correctly before testing on your phone, where debugging is harder.

## Step 5 — Deploy

```powershell
git add .
git commit -m "v0.3 slice 2: PWA shell (manifest, service worker, install prompt)"
git push
```

Wait for Vercel to show **Ready**, same as before.

## Step 6 — Test on your phone

**Android (Chrome):** Visit `https://nadi-eight.vercel.app`. Within a few
seconds you should see the install banner Nadi shows itself (bottom of screen),
or Chrome's own "Add to Home Screen" prompt. Either works — tap it, then
**Install**.

**iPhone (Safari — must be Safari, not Chrome for iOS, since only Safari can
install PWAs on iPhone):** Visit the same URL. You'll see Nadi's banner with
instructions: tap the Share icon (square with an arrow, in Safari's toolbar),
scroll down, tap **Add to Home Screen**, then **Add**.

After installing on either platform, close the browser completely and open Nadi
from the new icon on your home screen. It should launch full-screen with no
browser UI at all. Screenshot this from your phone.

---

## What changed and why

**A manifest and a service worker are the two required pieces.** The manifest
(`public/manifest.json`) tells the OS the app's name, icon, and that it should
open `display: standalone` — full-screen, no browser chrome. The service worker
(`public/sw.js`) is what both platforms require to be registered before
"Add to Home Screen" does anything more than bookmark a URL.

**The service worker already has a push handler, doing nothing yet.** It's
inert — nothing sends a push in this slice, so it never fires. It's here early
because Slice 3 needs a service worker already active on your phone before a
push subscription can even be created, and browsers are slow to adopt a
*replacement* service worker (only on the next visit after every old tab is
closed). Shipping the final version now avoids a second rollout delay later.

**Android and iPhone need genuinely different install code**, not just
different wording. Android fires a `beforeinstallprompt` event Nadi can
intercept and trigger with one tap. iOS fires nothing — there is no
programmatic install on iPhone, only the manual Share → Add to Home Screen
path, so the best the app can do on iOS is detect it and show instructions.

**The banner won't show forever once dismissed.** Tapping the × snoozes it for
14 days rather than hiding it permanently — dismissing something before fully
reading it is common, and permanent hiding would bury the option for good.

## Known gaps (deliberate, not oversights)

- The icon is a generated placeholder. Swap in a real logo whenever you have
  one.
- No offline support. The service worker registers but does no caching — that's
  a v0.5 performance slice, not part of installability.
- Firefox does not support the same install flow; the banner simply won't
  appear there, which is correct rather than a bug.
