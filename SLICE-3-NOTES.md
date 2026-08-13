# v0.3 — Slice 3: Web Push

**What this does:** your phone buzzes when a reminder comes due, with Nadi closed.

**Pass/fail for this slice:** you set a task reminder, put your phone down, and a
notification arrives on the lock screen without opening the app.

---

## Step 1 — Extract over your project

```powershell
cd C:\Users\admin\Downloads\ai-productivity
Expand-Archive -Path $HOME\Downloads\nadi-v0.3-slice3.zip -DestinationPath . -Force
```

## Step 2 — Install the new dependency

```powershell
npm install
```

Adds `web-push` (sends the notifications) and its type definitions.

## Step 3 — Generate your VAPID keypair

This is a one-time keypair proving push messages genuinely come from your server.

```powershell
npx web-push generate-vapid-keys
```

It prints a **Public Key** and a **Private Key**. Copy both into Notepad.

## Step 4 — Add them to `.env`

```powershell
notepad .env
```

Add these three lines, pasting your own keys:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=paste_the_public_key
VAPID_PRIVATE_KEY=paste_the_private_key
VAPID_SUBJECT=mailto:rahulanandbheemavarapu@gmail.com
```

The public key is deliberately `NEXT_PUBLIC_` — the browser needs it, and it is
public by design; it only identifies Nadi as the sender. The private key signs
push requests and must never reach the browser, which is why they are named
differently rather than kept as one blob.

## Step 5 — Migrate the database

```powershell
npm run db:migrate
```

Name it: `push-subscriptions`

Same caveat as last time: if your local `DATABASE_URL` points at the same Neon
database as production, this changes production too. Additive only — one new
table, one new nullable column.

## Step 6 — Check it compiles

```powershell
npm run verify
```

## Step 7 — Deploy first, then test

**Push cannot be tested on `localhost` from your iPhone.** iOS requires HTTPS
and a real installed PWA, so unlike the last two slices, production is where
this gets tested. Add the three variables in Vercel (Settings → Environment
Variables, Production and Preview), then:

```powershell
git add .
git commit -m "v0.3 slice 3: web push (VAPID, subscriptions, delivery)"
git push
```

Wait for **Ready**.

## Step 8 — Turn on notifications on your iPhone

1. Open Nadi **from the Home Screen icon** — not Safari. In a Safari tab, iOS
   refuses to create a push subscription at all.
2. Tap the **bell** in the nav.
3. At the bottom of the dropdown you should see **"Get reminders on this
   device"** with a **Turn on** button.
4. Tap **Turn on**. iOS will ask for permission — tap **Allow**.

**Be careful here.** If you tap "Don't Allow", iOS will not ask again. You would
have to go to Settings → Apps → Safari → clear website data, or delete and
reinstall the Home Screen icon. The button will show a "notifications are
blocked" message if this happens, so you will at least know why.

## Step 9 — Test it

1. In Nadi, add a task due about 12 minutes out, with a **10 minutes before**
   reminder.
2. Close Nadi completely — swipe it away from the app switcher.
3. Lock your phone and wait.
4. Within about 5 minutes of the reminder time, a notification should appear.

If nothing arrives after 10 minutes, check the Inngest dashboard → **Runs** →
open the latest `sweep-reminders` run. The `deliver-push-notifications` step
reports `pending`, `sent`, and `pruned` counts, which tells us whether the
problem is delivery or subscription. Send me that output.

---

## What changed and why

**Delivery is tracked separately from creation.** A new `pushedAt` column marks
when a reminder was sent. Creating a reminder and delivering it fail
differently — Postgres being unreachable and Apple's push service being
unreachable are unrelated events — so bundling them would mean a push outage
also stops reminders being recorded, silencing the reliable in-app bell to
protect the unreliable channel. Split, each retries independently.

**The Inngest job now has two steps.** Inngest retries a failed step on its own,
so a push failure retries only delivery rather than redoing the database work.

**Subscriptions belong to a User, not a Membership.** A phone belongs to a
person, not a household — somebody in both "Family" and "Office" should grant
permission once and get one copy of everything, not two.

**Dead subscriptions are pruned automatically.** When a push service returns
404 or 410, the device is gone for good (app deleted, site data cleared). Those
rows are deleted rather than retried forever. Other errors — timeouts, vendor
5xx — are treated as transient and left alone.

**The toggle has more states than on/off**, because "off" has several causes
needing different actions: install the app first (iOS in a Safari tab), change
it in Settings (permission denied, browser will not re-ask), or it will not work
here at all (Firefox). One greyed-out switch would leave you stuck with no idea
which.

## Known gaps (deliberate, not oversights)

- No per-device management UI. Subscriptions are stored with a user-agent
  string, but there is no screen listing "iPhone Safari, Windows Chrome" with
  individual toggles. Worth adding if you end up with several devices.
- Notification tapping opens the workspace dashboard, not the specific task.
  Deep-linking to a single task needs a task detail route, which does not exist
  yet.
- iOS delivery can lag by minutes, especially in Low Power Mode. That is Apple's
  behaviour, not something the code can fix.
