# Typecheck fix — noUncheckedIndexedAccess

Five files, replacing what you already extracted. No migration, no
`npm install`, no schema change.

```powershell
cd C:\Users\admin\Downloads\ai-productivity
Expand-Archive -Path $HOME\Downloads\nadi-v0.3-typecheck-fix.zip -DestinationPath . -Force
npm run verify
```

## What went wrong

Your `tsconfig.json` has `noUncheckedIndexedAccess` switched on. It makes
`array[i]` return `T | undefined` rather than `T`, on the grounds that the
index might be out of range — a strict flag, and a good one to have.

I typechecked with plain `--strict`, which does **not** include it. So ten
errors that your compiler catches, mine never saw. That is my error, and the
fix on my side is to check against your actual config rather than a
close-enough one.

## The four files

**`src/lib/collision.ts`** — the nested scan read `schedulable[i]` and
`schedulable[j]` inside the inner loop. Both now read once into a local and
narrow before use, which is also slightly less work per iteration.

**`src/lib/calendar.ts`** — `moveToDay` destructured
`targetKey.split("-").map(Number)` into three values the compiler could not
prove exist. Each now falls back to the original date's own part, so a
malformed key leaves the date untouched instead of producing `NaN` and a task
that disappears from every view.

**`src/server/services/push.service.ts`** — `subscriptions[index]` inside the
`allSettled` result loop. Order is guaranteed there so it always resolves, but
the compiler cannot know that; guarded.

**`src/lib/push.ts` + `push-toggle.tsx`** — a different problem that happened
to surface at the same time. TypeScript 5.7 made typed arrays generic over
their backing buffer, so `Uint8Array` is now `Uint8Array<ArrayBufferLike>` and
no longer unifies with the DOM's `BufferSource`, which `applicationServerKey`
requires. `urlBase64ToUint8Array` is now `urlBase64ToBuffer` and returns an
`ArrayBuffer` — a `BufferSource` under every TypeScript version — rather than
silencing the mismatch with a cast.

Behaviour is unchanged: collision detection and `moveToDay` were re-run against
the same cases afterwards, including month-end and year-boundary dates, with
identical results.
