# v0.3 — Slices 4, 5 & 7

Three features in one delivery: **smart rescheduling**, **collision detection**,
and **comments on tasks**. They share one migration and one install.

**Pass/fail:** open an overdue task → see a reschedule suggestion and accept it;
create two tasks close together for the same person → see a clash warning; leave
a comment on a task and see the count on the row.

---

## Step 1 — Extract

```powershell
cd C:\Users\admin\Downloads\ai-productivity
Expand-Archive -Path $HOME\Downloads\nadi-v0.3-slice457.zip -DestinationPath . -Force
```

## Step 2 — Install

```powershell
npm install
```

No new dependencies of my own — `package.json` is included only so Slice 3's
`web-push` is not lost if you extract this before applying that one.

## Step 3 — Migrate

```powershell
npm run db:migrate
```

Name it: `task-comments`

The schema in this zip **includes Slice 3's changes**. If you already ran Slice
3's migration, this adds only the comments table. If you have not, this one
migration covers both — either order works.

## Step 4 — Verify

```powershell
npm run verify
```

## Step 5 — Test locally

```powershell
npm run dev
```

**Rescheduling.** You have several overdue tasks already. Click one — a panel
slides in from the right (bottom on mobile). It should show a red box:
*"This is overdue. Move it to tomorrow at 2:20 PM?"* Click **Reschedule** and
the task moves. Nothing moves unless you click.

**Collisions.** Create two tasks for the same person less than 30 minutes
apart, both with a time (not all-day). Both rows should show a
**"Clashes with 1"** chip. Then make a third for a *different* person at the
same time — no warning, which is correct.

**Comments.** Open any task, type in the box at the bottom, click **Comment**.
Close the panel — the row should show 💬 1.

## Step 6 — Deploy

```powershell
git add .
git commit -m "v0.3 slices 4/5/7: rescheduling, collision detection, comments"
git push
```

---

## What changed and why

**A task detail panel now exists.** All three features needed somewhere to live,
and the task row is already dense. A panel rather than a page, so opening a task
does not lose your filter, search, and scroll position.

**Rescheduling suggests; it never acts.** You chose option B, and the code takes
it literally — nothing moves without a click. The suggestion keeps the original
time of day where there was one, because "gym at 7am" means 7am; a repeating
task uses its own recurrence rule, rolled forward until it lands in the future,
so a daily task missed for a week does not get "rescheduled" to six days ago.

**Collisions are derived, never stored** — the same reasoning as task status. A
stored flag would be wrong the moment either task moved.

**One honest limitation on collisions.** Your tasks have a deadline but no
duration, so there is no interval to overlap. "At the same time" therefore means
"due within 30 minutes of each other". That catches two things booked at once,
but it cannot know that a two-hour task and a five-minute one 90 minutes apart
also conflict. Fixing it properly means asking you to estimate a duration on
every task — a cost paid always, to improve a warning that matters occasionally.
Worth revisiting if the warning turns out to miss things you care about.

**Comments are flat, not threaded**, and authored by a Membership so your name
shows as whatever you are called in *that* workspace. Anyone in the workspace
can comment; deleting is limited to your own comments, or any if you are the
owner — adding to a conversation is collaborative, quietly removing someone
else's words is not.

## Known gaps (deliberate)

- Collision warnings appear on the list and in the panel, but not while you are
  filling in the task form. The `wouldCollide` function for that exists and is
  tested; wiring it into the form is a small follow-up.
- No editing comments, only posting and deleting.
- Comment counts refresh on close rather than live — no real-time sync until
  v0.5.
