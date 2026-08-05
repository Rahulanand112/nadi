"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Member = {
  id: string;
  displayName: string;
  role: string;
  userId: string;
  email: string;
};

type Invitation = {
  id: string;
  email: string;
  token: string;
  expiresAt: string;
};

export function MembersManager({
  slug,
  currentUserId,
  members,
  invitations,
}: {
  slug: string;
  currentUserId: string;
  members: Member[];
  invitations: Invitation[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsInviting(true);

    const response = await fetch(`/api/workspaces/${slug}/invitations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role: "MEMBER" }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Could not create the invitation.");
      setIsInviting(false);
      return;
    }

    setEmail("");
    setIsInviting(false);
    router.refresh();
  }

  async function revoke(id: string) {
    await fetch(`/api/invitations/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function removeMember(membershipId: string) {
    const response = await fetch(
      `/api/workspaces/${slug}/members?membershipId=${membershipId}`,
      { method: "DELETE" },
    );
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Could not remove that member.");
      return;
    }
    router.refresh();
  }

  async function copyLink(token: string) {
    const url = `${window.location.origin}/invite/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  return (
    <>
      <form onSubmit={invite} className="mt-8 flex gap-2">
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="their@email.com"
          className="flex-1 rounded-lg border border-paper-300 bg-paper-0 px-3 py-2 text-sm text-ink-900 outline-none focus:border-iris-600 dark:border-ink-800 dark:bg-ink-900 dark:text-paper-100"
        />
        <button
          type="submit"
          disabled={isInviting}
          className="rounded-lg bg-iris-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-iris-700 disabled:opacity-60"
        >
          {isInviting ? "Creating…" : "Create invite"}
        </button>
      </form>

      {error ? (
        <p className="mt-3 rounded-lg bg-status-overdue-soft px-3 py-2 text-sm text-status-overdue">
          {error}
        </p>
      ) : null}

      {invitations.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-xs uppercase tracking-widest text-ink-400">
            Pending invites
          </h2>
          <ul className="mt-3 space-y-2">
            {invitations.map((invite) => (
              <li
                key={invite.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-status-upcoming/30 bg-status-upcoming-soft px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink-900">{invite.email}</p>
                  <p className="text-xs text-ink-600">
                    Expires{" "}
                    {new Date(invite.expiresAt).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => copyLink(invite.token)}
                    className="rounded-md bg-ink-900 px-2.5 py-1.5 text-xs font-medium text-paper-0"
                  >
                    {copiedToken === invite.token ? "Copied" : "Copy link"}
                  </button>
                  <button
                    onClick={() => revoke(invite.id)}
                    className="rounded-md px-2.5 py-1.5 text-xs text-ink-600 hover:text-status-overdue"
                  >
                    Revoke
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-xs uppercase tracking-widest text-ink-400">
          In this workspace
        </h2>
        <ul className="mt-3 divide-y divide-paper-200 dark:divide-ink-800">
          {members.map((member) => (
            <li key={member.id} className="flex items-center justify-between py-3">
              <div className="min-w-0">
                <p className="text-sm text-ink-900 dark:text-paper-100">
                  {member.displayName}
                  {member.userId === currentUserId ? (
                    <span className="ml-2 text-xs text-ink-400">you</span>
                  ) : null}
                </p>
                <p className="truncate text-xs text-ink-400">{member.email}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-mono text-xs uppercase tracking-wider text-ink-400">
                  {member.role.toLowerCase()}
                </span>
                {member.userId !== currentUserId ? (
                  <button
                    onClick={() => removeMember(member.id)}
                    className="text-xs text-ink-400 hover:text-status-overdue"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
