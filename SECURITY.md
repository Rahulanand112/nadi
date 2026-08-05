# Security notes

Written down because the workspace model makes certain mistakes easy and their
consequences serious: showing one household another household's data.

## Tenant isolation

Every workspace-scoped page and route resolves access through a single
function, `requireWorkspaceAccess(slug, userId)` in
`src/server/services/workspace.service.ts`. It looks the workspace up by slug,
confirms the caller holds a `Membership` in it, and throws otherwise.

Two structural choices back this up:

- **Scope is in the URL, not in a cookie.** A request carries the workspace it
  is asking about. There is no ambient "current workspace" that can go stale
  and silently render the wrong data. (ADR 007.)
- **The check runs in the route-group layout** (`src/app/(app)/w/[slug]/layout.tsx`),
  so it cannot be forgotten when a new page is added underneath.

Assignment is validated separately: `taskService` confirms that any
`assigneeId` belongs to the same workspace as the task, so a crafted request
cannot attach a task to a member of a different household.

## Authentication

Handled by Better Auth (`src/lib/auth.ts`) — password hashing, session tokens,
and session storage are the library's responsibility, not hand-rolled.
Sessions live in the database (`session` table), so sign-out is a real
revocation rather than a discarded cookie.

`BETTER_AUTH_SECRET` signs session tokens and must be a distinct random value
per environment. `.env` is gitignored; `.env.example` documents the shape
without the values.

## Authorization rules

| Action | Who |
| ------ | --- |
| Invite a member | Workspace owner only |
| Revoke an invitation | Workspace owner only |
| Remove a member | Owner, or the member removing themselves |
| Remove the last owner | Nobody — blocked, or the workspace becomes unmanageable |
| Create, edit, complete, delete a task | Any member of the workspace |

Task edits are intentionally open to all members. This is a shared household
board: restricting edits to the assignee would prevent a parent rescheduling a
child's task, which is a primary use case rather than an edge case.

## Invitations

Invitation tokens are bearer credentials — 32 random bytes, base64url encoded.
They expire after seven days, are consumed on first use, and every pending
invitation is listed on the members page so an owner can revoke one.

This is the "anyone with the link" model, chosen deliberately (ADR 006). It is
appropriate for households and small teams. A deployment serving regulated or
enterprise customers should bind invitations to the recipient's verified email
address instead.

## Known gaps at v0.1

Named rather than left implicit:

- **No rate limiting** on sign-in or invitation creation. Fine behind Vercel's
  default protections at this scale; needs addressing before any real user base.
- **No email verification.** Addresses are collected but unverified, so an
  account could be created against someone else's address.
- **No audit log.** Who removed whom, and when, is not recorded.
- **Invitation email is a label, not a lock.** Whoever opens the link joins,
  regardless of the address it was addressed to.

These are scheduled work, not oversights. Rate limiting and email verification
belong in v1.0's security pass.
