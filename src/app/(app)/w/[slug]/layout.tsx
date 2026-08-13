import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  requireWorkspaceAccess,
  workspaceService,
} from "@/server/services/workspace.service";
import { AppError } from "@/server/errors";
import { WorkspaceNav } from "@/components/features/workspace/workspace-nav";
import { TimezoneSync } from "@/components/features/workspace/timezone-sync";
import { userService } from "@/server/services/user.service";
import { env } from "@/lib/env";

/**
 * Every page under /w/[slug] passes through here, so the membership check
 * happens once rather than being repeated (and eventually forgotten) in each
 * page. If you are not a member of this workspace, you never reach the page.
 */
export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const { slug } = await params;

  let workspace;
  let membership;
  try {
    const access = await requireWorkspaceAccess(slug, session.user.id);
    workspace = access.workspace;
    membership = access.membership;
  } catch (error) {
    if (error instanceof AppError) notFound();
    throw error;
  }

  const [memberships, timezone] = await Promise.all([
    workspaceService.listForUser(session.user.id),
    userService.getTimezone(session.user.id),
  ]);

  return (
    <div className="min-h-dvh">
      {/* Renders nothing; corrects the stored timezone if this device
          disagrees with it. Placed in the layout so it runs on every page
          rather than only wherever somebody remembered to add it. */}
      <TimezoneSync current={timezone} />

      <WorkspaceNav
        currentSlug={workspace.slug}
        currentName={workspace.name}
        isOwner={membership.role === "OWNER"}
        workspaces={memberships.map((m) => ({
          slug: m.workspace.slug,
          name: m.workspace.name,
        }))}
        vapidPublicKey={env.NEXT_PUBLIC_VAPID_PUBLIC_KEY}
      />
      {children}
    </div>
  );
}
