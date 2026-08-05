"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "@/lib/auth-client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: signInError } = await signIn.email({ email, password });

    if (signInError) {
      setError("That email and password don't match. Try again.");
      setIsSubmitting(false);
      return;
    }

    router.push(next ?? "/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-400">
        Nadi
      </p>
      <h1 className="mt-3 font-display text-3xl text-ink-900 dark:text-paper-50">
        Welcome back
      </h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-ink-800 dark:text-paper-200">
            Email
          </span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="w-full rounded-lg border border-paper-300 bg-paper-0 px-3 py-2 text-sm text-ink-900 outline-none focus:border-iris-600 dark:border-ink-800 dark:bg-ink-900 dark:text-paper-100"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-ink-800 dark:text-paper-200">
            Password
          </span>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full rounded-lg border border-paper-300 bg-paper-0 px-3 py-2 text-sm text-ink-900 outline-none focus:border-iris-600 dark:border-ink-800 dark:bg-ink-900 dark:text-paper-100"
          />
        </label>

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
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-600 dark:text-ink-400">
        Don&rsquo;t have an account?{" "}
        <a
          href={next ? `/sign-up?next=${encodeURIComponent(next)}` : "/sign-up"}
          className="font-medium text-iris-600 hover:underline"
        >
          Create one
        </a>
      </p>
    </main>
  );
}

/** useSearchParams requires a Suspense boundary in the App Router. */
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
