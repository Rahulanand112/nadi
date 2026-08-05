"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signUp } from "@/lib/auth-client";

/**
 * Sign-up is a two-step flow, done here as one form:
 *   1. Create the account with Better Auth (email + password + name).
 *   2. Create the workspace the account owns, via our own API route.
 *
 * If step 2 fails after step 1 succeeds, the person has an account but no
 * workspace yet. We surface that plainly rather than hiding it -- see the
 * error state below -- since silently losing the workspace name would be
 * worse than asking them to retry.
 */
function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Arriving from an invite link: skip workspace creation and send them back
  // to accept the invite instead. You either create a space or join one.
  const next = searchParams.get("next");
  const isJoining = Boolean(next);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: signUpError } = await signUp.email({ name, email, password });

    if (signUpError) {
      setError(signUpError.message ?? "Could not create your account.");
      setIsSubmitting(false);
      return;
    }

    if (isJoining) {
      router.push(next!);
      router.refresh();
      return;
    }

    const response = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceName, displayName: name }),
    });

    if (!response.ok) {
      setError(
        "Your account was created, but the workspace could not be. Sign in and try again from your dashboard.",
      );
      setIsSubmitting(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-400">
        Nadi
      </p>
      <h1 className="mt-3 font-display text-3xl text-ink-900 dark:text-paper-50">
        Create your account
      </h1>
      <p className="mt-2 text-sm text-ink-600 dark:text-ink-400">
        {isJoining
          ? "Then you'll be taken back to accept your invitation."
          : "You'll also set up the space your household or team shares."}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <Field label="Your name">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            autoComplete="name"
          />
        </Field>

        <Field label="Email">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            autoComplete="email"
          />
        </Field>

        <Field label="Password">
          <input
            required
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            autoComplete="new-password"
          />
        </Field>

        {isJoining ? null : (
          <Field
            label="Workspace name"
            hint="e.g. &ldquo;Sharma Family&rdquo; or &ldquo;Acme Team&rdquo;"
          >
            <input
              required
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className={inputClass}
            />
          </Field>
        )}

        {error ? (
          <p className="rounded-lg bg-status-overdue-soft px-3 py-2 text-sm text-status-overdue">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-iris-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-iris-700 disabled:opacity-60"
        >
          {isSubmitting ? "Creating your account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-600 dark:text-ink-400">
        Already have an account?{" "}
        <a
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="font-medium text-iris-600 hover:underline"
        >
          Sign in
        </a>
      </p>
    </main>
  );
}

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  );
}

const inputClass =
  "w-full rounded-lg border border-paper-300 bg-paper-0 px-3 py-2 text-sm text-ink-900 outline-none focus:border-iris-600 dark:border-ink-800 dark:bg-ink-900 dark:text-paper-100";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink-800 dark:text-paper-200">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="mt-1 block text-xs text-ink-400">{hint}</span>
      ) : null}
    </label>
  );
}
