import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireWorkspaceAccess } from "@/server/services/workspace.service";
import { membershipService } from "@/server/services/invitation.service";

export default async function WorkspaceDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const { slug } = await params;
  // Access already verified by the layout; this re-read is cheap and keeps
  // the page independently correct rather than relying on layout order.
  const { workspace, membership } = await requireWorkspaceAccess(slug, session!.user.id);
  const members = await membershipService.list({
    workspaceId: workspace.id,
    userId: session!.user.id,
  });

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-400">
        Nadi &middot; v0.1.0-alpha.1 &middot; Slice 3
      </p>
      <h1 className="mt-3 font-display text-3xl text-ink-900 dark:text-paper-50">
        {workspace.name}
      </h1>
      <p className="mt-2 text-sm text-ink-600 dark:text-ink-400">
        You&rsquo;re here as &ldquo;{membership.displayName}&rdquo;
        {membership.role === "OWNER" ? ", the owner" : ""}.
      </p>

      <section className="mt-10 rounded-card border border-paper-200 bg-paper-0 p-6 dark:border-ink-800 dark:bg-ink-900">
        <p className="text-xs uppercase tracking-widest text-ink-400">
          {members.length === 1 ? "1 member" : `${members.length} members`}
        </p>
        <ul className="mt-4 space-y-3">
          {members.map((member) => (
            <li key={member.id} className="flex items-center justify-between">
              <span className="text-sm text-ink-900 dark:text-paper-100">
                {member.displayName}
              </span>
              <span className="font-mono text-xs uppercase tracking-wider text-ink-400">
                {member.role.toLowerCase()}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-6 text-sm text-ink-400">
        Tasks and the shared calendar arrive in Slices 4 and 6.
      </p>
    </main>
  );
}
