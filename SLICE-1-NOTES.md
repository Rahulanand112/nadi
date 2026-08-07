# v0.3 — Slice 1: Reminders engine

**What this does:** works out when a reminder is due and records it. Reminders appear
in a bell in the nav. Nothing reaches your phone yet — that is Slices 2 and 3.

**Pass/fail for this slice:** you set a task due in ~10 minutes with a "10 minutes
before" reminder, the sweep runs, and the reminder shows up in the bell.

---

## Step 1 — Extract over your project

```powershell
cd C:\Users\admin\Downloads\ai-productivity
Expand-Archive -Path $HOME\Downloads\nadi-v0.3-slice1.zip -DestinationPath . -Force
```

## Step 2 — Install the one new dependency

```powershell
npm install
```

`inngest` is the only addition. It is already in `package.json` — this slice was
checked against every import before packaging.

## Step 3 — Add the Inngest keys locally

Open `.env.local` in your project folder and add your two keys:

```
INNGEST_EVENT_KEY=paste_your_event_key
INNGEST_SIGNING_KEY=paste_your_signing_key
```

While you are in there, check `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` exist too.
They are now validated at startup, so a missing one stops the app with a message
naming the exact variable instead of failing later with "Invalid origin".

## Step 4 — Migrate the database

```powershell
npm run db:migrate
```

When it asks for a migration name, type: `reminders`

**Read this before running it.** If your local `DATABASE_URL` points at the same
Neon database as production — which it probably does, since you have one Neon
project — this changes production too. That is what we want here, and the change
is additive (new columns with defaults, one new table), so nothing existing
breaks. But you should know it is happening rather than discover it later.

## Step 5 — Check it compiles

```powershell
npm run verify
```

Both typecheck and lint should pass. If either fails, paste the full output to me
and stop — do not try to fix it yourself.

## Step 6 — Run locally

```powershell
npm run dev
```

In a **second** PowerShell window, start the Inngest dev server:

```powershell
npx inngest-cli@latest dev
```

That opens a local dashboard at `http://localhost:8288` where you can watch the
sweep run. Leave both windows open.

## Step 7 — Test it

1. Go to `http://localhost:3000` and open a workspace.
2. Add a task with a due date and time about **12 minutes from now**.
3. Tick **Remind me** and choose **10 minutes before**.
4. Save it.
5. Open `http://localhost:8288`, find **sweep-reminders-manual**, and send the
   event `reminders/sweep.requested`. Nothing should be created yet — it is not
   due.
6. Wait until you are inside the 10-minute window, then send it again.
7. Refresh Nadi. The bell in the nav should show a badge; click it to see the
   reminder.

Also worth testing: a habit with a time of day set a few minutes ahead, reminder
on, then sweep.

## Step 8 — Deploy

Add the same two Inngest keys in Vercel (Settings → Environment Variables,
Production and Preview, same as you did for `BETTER_AUTH_URL`), then push:

```powershell
git add .
git commit -m "v0.3 slice 1: reminders engine (Inngest sweep, Reminder model)"
git push
```

After the deploy is green, go to the Inngest dashboard and connect your app by
pointing it at `https://nadi-eight.vercel.app/api/inngest`. The cron will then run
every 5 minutes on its own.

---

## What changed and why

**A sweep, not a scheduled job.** Rather than scheduling a delayed job when you
tick the toggle, a cron runs every 5 minutes and asks "what is due now". Tasks get
rescheduled, completed, deleted, and respawned by recurrence — every one of those
would leave an in-flight job pointing at a deadline that no longer exists, and any
path that forgot to cancel would fire a wrong reminder. A sweep reads current state
and cannot go stale. Cost: a reminder can be a few minutes late.

**Tasks needed no timezone work.** Your task form already converts local time to a
real instant in the browser, so a task reminder is just `dueAt` minus the offset.

**Habits did.** A habit has no instant — "morning run at 7am" is a wall-clock
intention. That needed `remindAtMinutes` on `Habit` and `timezone` on `User`,
captured from the browser. Done with `Intl` rather than a date library: about
thirty lines, no dependency to keep updated.

**Two things fixed while in here.** `BETTER_AUTH_URL` and `BETTER_AUTH_SECRET` are
now validated at boot, and `trustedOrigins` is set in `auth.ts` — which means
preview deployments will stop failing auth with "Invalid origin".

## Known gaps (deliberate, not oversights)

- Existing habits have no time of day, so they cannot carry reminders until you
  set one. There is no edit UI for that yet — the API route exists
  (`PATCH /api/habits/[id]`), the control does not. Easiest path for now: create
  the habit fresh with a time.
- Editing a task's reminder after creation works through the API but has no UI.
- The bell polls once a minute. Real-time is a v0.5 slice.
