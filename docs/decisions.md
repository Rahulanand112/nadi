# Architecture decision record

Decisions that were not obvious, and would be expensive to reverse. Each entry
records the alternatives considered and what would make us revisit.

---

## ADR 001 — Web first, native client later

**Date:** August 2026
**Status:** Accepted

### Context

The product requires push notifications and location-triggered reminders. Both
need a native runtime: browsers cannot perform background geofencing, and web
push is unreliable once the tab or browser is closed.

### Options

1. **React Native (Expo) from the start.** Correct runtime for the eventual
   feature set, but delays a testable product by weeks, and the dense dashboard,
   calendar and analytics views that make up v0.1 and v0.2 are harder to build
   and worse to use on mobile first.
2. **Next.js web application, native client added later.** Fastest path to
   something real users can try. Defers the native-only features.
3. **Both from the start.** Two frontends to maintain before either has proven
   its value.

### Decision

Option 2. Every feature that genuinely requires native APIs is scheduled for
v0.3 or later. Building the mobile shell before there is a product to put in it
optimises for a constraint that does not bind yet.

### Consequence

The backend must be portable enough for a second client to consume without
modification. This is what makes ADR 002 non-negotiable rather than stylistic.

Location-based reminders are formally moved out of v0.5 and into whichever
version follows the native client. Shipping them on web would mean shipping
something that does not work.

---

## ADR 002 — Business logic lives behind a service boundary

**Date:** August 2026
**Status:** Accepted

### Context

Next.js allows database queries directly inside pages and route handlers. It is
the fastest way to build and the default in most tutorials.

### Decision

All business logic lives in `src/server/`, which may not import from Next.js,
React, or the UI layer. Pages and route handlers call services. Services call
repositories. Repositories are the only code that touches Prisma.

Enforced by `no-restricted-imports` rules in `eslint.config.mjs`, in both
directions — the app layer is also blocked from importing the database client
directly.

### Rationale

Two foreseeable changes would otherwise become rewrites:

- The React Native client in v0.3 needs to call the same logic.
- Scheduled reminders may force the backend off serverless, where per-invocation
  cold starts are costly for time-sensitive delivery.

A convention that relies on discipline decays under deadline pressure. A lint
rule that fails the build does not.

### Cost

More indirection than the feature set currently justifies. Accepted knowingly:
the alternative is discovering the coupling at the point where it is most
expensive to remove.

---

## ADR 005 — Authentication and multi-tenancy are separate concerns

**Date:** August 2026
**Status:** Accepted

### Context

Better Auth ships an "organization" plugin that provides multi-tenant groups,
membership roles, and invitations out of the box. Adopting it would remove the
need to design and build `Workspace`, `Membership`, and `Invitation` ourselves.

### Decision

Better Auth is used for authentication only: identity, sessions, sign-up, and
sign-in. The `Workspace` and `Membership` models are Nadi's own, defined in
`prisma/schema.prisma` and owned by `src/server/services/workspace.service.ts`,
independent of the auth library.

### Rationale

The multi-member household/team model is the product's core differentiator,
not an incidental feature. Adopting a generic library's organization primitive
means every future decision about it — per-member privacy, shared versus
personal task visibility, leaderboard scoping, a member existing without a
login of their own (a young child, for instance) — has to fit that library's
assumptions rather than the product's actual shape.

A concrete naming collision reinforced this: Better Auth's own schema already
defines a model called `Account`, meaning "a linked OAuth or credential
provider" — unrelated to what the product spec calls an "account" (a
household or team). Keeping the tenant model separate and naming it
`Workspace` avoids two unrelated concepts sharing one name in the same schema.

### Cost

Membership, roles, and invitations are built and maintained by hand rather than
inherited from a library — roughly the service and two models in
`workspace.service.ts` and `workspace.repository.ts`, plus the `Invitation`
model added ahead of Slice 3. Accepted because the alternative cost —
retrofitting per-member semantics the product actually needs into a generic
plugin's shape — is larger and arrives later, when more code depends on it.

---

## ADR 003 — PostgreSQL over a document database

**Date:** August 2026
**Status:** Accepted

### Context

The data model is relational throughout: members belong to accounts, tasks
belong to members and accounts, habits generate completion records, analytics
aggregate across all of them.

### Decision

PostgreSQL, hosted on Neon.

### Rationale

Leaderboards, productivity scoring and shared calendars are aggregate queries
across several entities. These are joins. Modelling them in a document store
would mean either denormalising and maintaining consistency in application code,
or performing joins in application code — both worse than letting the database
do what it is built for.

Neon specifically for the free tier and for database branching, which allows a
preview deployment to run against an isolated copy of production data.

---

## ADR 004 — Brand colour excluded from the status palette

**Date:** August 2026
**Status:** Accepted

### Context

Task status is fixed by the product specification: green for complete, amber for
upcoming, red for overdue. These three colours therefore carry semantic meaning
throughout the interface.

### Decision

The brand accent is iris (`#4F46B8`), deliberately distant from all three.

### Rationale

If the primary action colour were green, a primary button and a completed task
would share a visual language while meaning different things. Reserving three
hues for status and placing the brand outside them keeps the semantics
unambiguous — the constraint drove the palette rather than the other way around.
