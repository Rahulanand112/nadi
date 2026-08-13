# v0.3 — Slice 6: Drag-and-drop calendar

**What this does:** move a task to a different day by dragging it onto a
calendar cell.

**Pass/fail:** on your iPhone, drag a task's grip handle onto another day and it
moves — time of day preserved.

---

## Step 1 — Extract

```powershell
cd C:\Users\admin\Downloads\ai-productivity
Expand-Archive -Path $HOME\Downloads\nadi-v0.3-slice6.zip -DestinationPath . -Force
```

No `npm install`, **no migration** — this slice adds no dependencies and
changes no schema. It reuses the `PATCH /api/tasks/[id]` route that already
exists.

## Step 2 — Verify

```powershell
npm run verify
```

## Step 3 — Test on desktop

```powershell
npm run dev
```

Go to the Calendar page. Pick a day with tasks. In the list underneath, each
task now has a **grip handle** (six dots) on the left. Drag it onto any day cell
above — the cell highlights, and dropping moves the task there.

## Step 4 — Deploy and test on your phone

```powershell
git add .
git commit -m "v0.3 slice 6: drag-and-drop calendar"
git push
```

Then on your iPhone, open Nadi **from the Home Screen**, go to Calendar, and
drag a grip onto another day. This is the test that matters — see below.

---

## What changed and why

**Pointer Events, not HTML5 drag-and-drop.** This is the entire reason this
slice needed its own pass. The obvious implementation — `draggable="true"` with
`dragstart` and `drop` — **does not work at all on iOS Safari**. Those events
were designed for desktop and Apple never wired them to touch, so on the phone
you actually use, that version would not be "a bit worse", it would be
completely inert. Pointer Events handle mouse, touch and pen through one path.

The cost is that nothing comes for free: no drag image, no drop targets, no
`dragover`. The floating label that follows your finger is drawn by hand, and
the day under the pointer is found by asking the document what is at those
coordinates, because pointer capture means the day cells never hear about the
gesture at all.

**A grip handle, not the whole card.** The handle carries `touch-action: none`,
which tells the browser not to claim the gesture for scrolling. Putting that on
the entire card would mean the page could not be scrolled by swiping anywhere a
task happens to be — a much worse trade than one small grip to grab.

**A 6px movement threshold** before a drag begins, so an ordinary tap still
selects rather than starting a drag on the tiny movement in any real finger
press.

**The task moves visually before the server confirms.** Waiting for the round
trip would leave it sitting on the old day for a moment after your finger lifts,
which reads as the drag having failed. If the request fails it snaps back —
visible, and better than a task silently sitting on the wrong day while you
believe it moved.

**Time of day is preserved.** Dragging "7am gym" from Monday to Wednesday keeps
it at 7am. Resetting to midnight would throw away the one scheduling decision
you actually made, and you would set it again every single time.

## Known gaps (deliberate)

- You can only drag from the day list, not from the small dots in the calendar
  grid. Those dots are 6px — not a touch target anyone can reliably hit.
- No auto-paging when you drag to the edge of the calendar. Move to the next
  month first, then drag.
- No drag reordering within a day. Tasks have no manual order to reorder by.
