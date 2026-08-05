import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireWorkspaceAccess } from "@/server/services/workspace.service";
import { membershipService, invitationService } from "@/server/services/invitation.service";
import { MembersManager } from "@/components/features/workspace/members-manager";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const { slug } = await params;
  const { workspace, membership } = await requireWorkspaceAccess(slug, session!.user.id);

  if (membership.role !== "OWNER") {
    redirect(`/w/${slug}/dashboard`);
  }

  const [members, invitations] = await Promise.all([
    membershipService.list({ workspaceId: workspace.id, userId: session!.user.id }),
    invitationService.listPending({ workspaceId: workspace.id, userId: session!.user.id }),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-display text-3xl text-ink-900 dark:text-paper-50">
        Members
      </h1>
      <p className="mt-2 text-sm text-ink-600 dark:text-ink-400">
        Invite people to {workspace.name} by sending them a link.
      </p>

      <MembersManager
        slug={slug}
        currentUserId={session!.user.id}
        members={members.map((m) => ({
          id: m.id,
          displayName: m.displayName,
          role: m.role,
          userId: m.userId,
          email: m.user.email,
        }))}
        invitations={invitations.map((i) => ({
          id: i.id,
          email: i.email,
          token: i.token,
          expiresAt: i.expiresAt.toISOString(),
        }))}
      />
    </main>
  );
}
