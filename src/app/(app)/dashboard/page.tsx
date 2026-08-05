import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { workspaceService } from "@/server/services/workspace.service";

/**
 * /dashboard is a signpost, not a page. Every real view lives under
 * /w/[slug]/... so the workspace being viewed is always explicit in the URL.
 * This route just sends you to your first workspace.
 */
export default async function DashboardRedirectPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const memberships = await workspaceService.listForUser(session.user.id);
  const first = memberships[0];

  if (!first) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
        <h1 className="font-display text-2xl text-ink-900 dark:text-paper-50">
          You&rsquo;re not in a workspace yet
        </h1>
        <p className="mt-2 text-sm text-ink-600 dark:text-ink-400">
          Ask whoever set up your household or team for an invite link.
        </p>
      </main>
    );
  }

  redirect(`/w/${first.workspace.slug}/dashboard`);
}
