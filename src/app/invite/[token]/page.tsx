import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { invitationService } from "@/server/services/invitation.service";
import { AppError } from "@/server/errors";
import { AcceptInvite } from "@/components/features/workspace/accept-invite";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  let workspaceName: string;
  try {
    const invitation = await invitationService.preview(token);
    workspaceName = invitation.workspace.name;
  } catch (error) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
        <h1 className="font-display text-2xl text-ink-900 dark:text-paper-50">
          This link doesn&rsquo;t work
        </h1>
        <p className="mt-2 text-sm text-ink-600 dark:text-ink-400">
          {error instanceof AppError
            ? error.message
            : "The invitation could not be found."}{" "}
          Ask whoever invited you for a fresh link.
        </p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-400">
          Nadi
        </p>
        <h1 className="mt-3 font-display text-3xl text-ink-900 dark:text-paper-50">
          Join {workspaceName}
        </h1>
        <p className="mt-2 text-sm text-ink-600 dark:text-ink-400">
          Sign in or create an account, then come back to this link to join.
        </p>
        <div className="mt-6 flex gap-3">
          <a
            href={`/sign-up?next=/invite/${token}`}
            className="rounded-lg bg-iris-600 px-4 py-2 text-sm font-medium text-white hover:bg-iris-700"
          >
            Create an account
          </a>
          <a
            href={`/login?next=/invite/${token}`}
            className="rounded-lg border border-paper-300 px-4 py-2 text-sm font-medium text-ink-800 hover:bg-paper-100 dark:border-ink-800 dark:text-paper-200"
          >
            Sign in
          </a>
        </div>
      </main>
    );
  }

  return (
    <AcceptInvite
      token={token}
      workspaceName={workspaceName}
      defaultDisplayName={session.user.name}
    />
  );
}
