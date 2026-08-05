import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { workspaceService } from "@/server/services/workspace.service";
import { SignOutButton } from "@/components/features/auth/sign-out-button";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const memberships = await workspaceService.listForUser(session.user.id);
  const primary = memberships[0];

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-400">
            Nadi &middot; v0.1.0-alpha.1 &middot; Slice 2
          </p>
          <h1 className="mt-3 font-display text-3xl text-ink-900 dark:text-paper-50">
            Welcome, {session.user.name}
          </h1>
        </div>
        <SignOutButton />
      </div>

      <section className="mt-10 rounded-card border border-paper-200 bg-paper-0 p-6 dark:border-ink-800 dark:bg-ink-900">
        {primary ? (
          <>
            <p className="text-xs uppercase tracking-widest text-ink-400">
              Your workspace
            </p>
            <p className="mt-1 text-lg font-medium text-ink-900 dark:text-paper-50">
              {primary.workspace.name}
            </p>
            <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">
              You are the {primary.role === "OWNER" ? "owner" : "member"},
              shown as &ldquo;{primary.displayName}&rdquo;.
            </p>
          </>
        ) : (
          <p className="text-sm text-ink-600 dark:text-ink-400">
            You don&rsquo;t belong to a workspace yet.
          </p>
        )}
      </section>

      <p className="mt-6 text-sm text-ink-400">
        Tasks, invitations, and the shared calendar arrive in the slices
        ahead. This page exists to prove the full loop: sign up, get a
        workspace, sign in, stay signed in.
      </p>
    </main>
  );
}
