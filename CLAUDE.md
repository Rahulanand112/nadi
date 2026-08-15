# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Nadi — shared task and habit tracking for families and small teams. An account
is a household or team (`Workspace`); members live inside it and every task,
habit and stat belongs to a member while staying visible to the group.
Next.js 15 App Router, TypeScript, Prisma/PostgreSQL (Neon), Better Auth,
Tailwind 4, Inngest for background jobs.

Currently v0.3 (scheduling and collaboration: reminders, rescheduling,
collision detection, drag-and-drop calendar, comments).

## Commands

```
npm run dev         # dev server
npm run build        # prisma generate + next build
npm run typecheck    # tsc --noEmit
npm run lint          # next lint, including the architectural boundary rules below
npm run verify         # typecheck + lint — run this before considering a change done
npm run db:migrate      # create and apply a migration locally (needs DIRECT_URL)
npm run db:studio        # browse the database
```

There is no test suite/framework configured in this repo (no test script, no
test files) — `verify` (typecheck + lint) is the correctness gate.

`GET /api/health` checks DB connectivity; the home page renders the same
check for humans.

## Architecture — read before editing anything under `src/`

```
src/app/        Routes and UI. Parses input, calls a service, renders.
src/server/     ALL business logic. Must never import Next.js, React, or the UI layer.
  services/     Domain operations — the only entry point the app layer is allowed to call.
  repositories/ Database access — the only place Prisma is used.
src/lib/        Framework-agnostic helpers (pure functions, no server/app dependency).
```

Request path: `page or route handler -> service -> repository -> Prisma -> Postgres`.

Route handlers/pages stay thin: validate input, call a service, map domain
errors to HTTP via `toErrorResponse` (`src/lib/api-error.ts`). Services never
know what an HTTP status is — they throw typed domain errors from
`src/server/errors.ts` (`NotFoundError`, `ForbiddenError`, `ValidationError`,
or `AppError` with a code from `AppErrorCode`), and the app layer translates.

**This boundary is enforced by ESLint (`eslint.config.mjs`), not convention —
a violation fails the build:**
- `src/server/**` cannot import `next`/`next/*`, `react`/`react-dom`, or
  anything from `@/app/*` / `@/components/*`.
- `src/app/**` cannot import `@/server/db`, `@/server/repositories/*`, or
  `@prisma/client` directly — it must go through a service, and Prisma types
  come from `@/types`, not the ORM.

Why this matters here specifically: a React Native client is planned (v0.3+)
that will call the same service layer, and reminders may force the backend
off serverless. If business logic lived in route handlers, both would be
rewrites; behind the service boundary, both are configuration changes. Don't
add a shortcut that reaches past a service into a repository, or past a
repository into Prisma from the app layer, even for "just this one query."

### Tenant isolation

The single most important invariant in this codebase: **never let one
workspace see another's data.** Every workspace-scoped route lives under
`src/app/(app)/w/[slug]/...`, and `requireWorkspaceAccess(slug, userId)`
(`src/server/services/workspace.service.ts`) runs in that segment's layout —
so no page underneath it is reachable without a verified `Membership`. The
active workspace is carried in the URL, deliberately not in a cookie/session
(ADR 007) — there is no ambient "current workspace" that can go stale and
render the wrong household's data. When adding anything that touches
cross-entity data (assigning a task, moving a reminder), validate the target
belongs to the same workspace, the way `taskService` already does for
`assigneeId`. See `SECURITY.md` for the full authorization table and known
gaps.

### Data model notes (see `prisma/schema.prisma` for full field-level rationale)

- **Task status (green/amber/red) is never stored** — always derived at read
  time from `completedAt`/`dueAt` (`src/lib/task-status.ts`), so nothing can
  go silently stale. Follow the same pattern for any similarly-derivable
  state; don't add a column for something computable from existing fields.
- **Habits are not recurring tasks.** Modeled separately on purpose — a
  missed task is a failure to reschedule, a missed habit day is just a gap in
  a chain. Don't unify their semantics.
- **Recurring tasks spawn their next occurrence on completion**, advancing
  from the *due date* (not "now"), so a late completion doesn't drift the
  series later each cycle.
- **Reminders are a fired-notification log, not a schedule.** A cron sweep
  (`src/server/inngest/functions.ts`, every 5 min) computes what's currently
  due from the task/habit's own fields and writes rows here — there is no
  per-reminder delayed job to cancel/reschedule when a task moves. If you add
  a new reminder-eligible entity, follow the sweep pattern rather than
  scheduling a job at creation time.
- Tasks/habits/comments/reminders attach to a `Membership`, not a `User`
  directly — the same person can be a member of multiple workspaces with a
  different display name in each, and this is how workspace scoping is
  threaded through the domain. `PushSubscription` is the one exception,
  attached to `User` (a device belongs to a person, not a household).
- Times of day that are wall-clock (habit reminder time) are stored as
  minutes-from-midnight, not `DateTime` — they need pairing with
  `User.timezone` to mean anything, and keeping that distinction visible in
  the schema/types matters (don't collapse it into a UTC timestamp).

### Auth vs. workspace/membership — stay separate

Better Auth (`src/lib/auth.ts`) owns identity/sessions only. `Workspace` and
`Membership` are Nadi's own models and service
(`workspace.service.ts`/`workspace.repository.ts`), deliberately not using
Better Auth's "organization" plugin (ADR 005) — don't reach for that plugin
to solve a membership/role problem here.

### Invitations

Share-link based, not email-bound (ADR 006): a token is a bearer credential,
expires in 7 days, single-use, revocable from the members page. Don't add
email-address binding without revisiting that ADR with the user.

## Conventions

- `noUncheckedIndexedAccess` is on — `array[i]` is `T | undefined`. Read into
  a local and narrow before use rather than asserting past it.
- Path alias `@/*` → `src/*`.
- Environment variables are validated once at boot via `src/lib/env.ts`
  (Zod) — add new env vars there rather than reading `process.env` directly,
  so a missing/misconfigured value fails at startup with a specific message
  instead of surfacing later as an opaque error mid-request.
- `DATABASE_URL` must be the **pooled** Neon connection string;
  `DIRECT_URL` the unpooled one (needed by Prisma Migrate).

## Docs worth reading before large changes

- `README.md` — product framing, roadmap, stack rationale.
- `docs/decisions.md` — ADRs; check before revisiting an architectural choice
  (native client timing, service boundary, auth/workspace split, invitation
  model, workspace-in-URL, Postgres choice, brand color exclusion).
- `SECURITY.md` — tenant isolation mechanics, authorization table, known gaps
  (no rate limiting, no email verification, no audit log at this version).
