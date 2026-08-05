"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();

  return (
    <button
      onClick={async () => {
        await signOut();
        router.push("/login");
        router.refresh();
      }}
      className="rounded-lg border border-paper-300 px-3 py-1.5 text-sm text-ink-600 transition hover:bg-paper-100 dark:border-ink-800 dark:text-ink-400 dark:hover:bg-ink-900"
    >
      Sign out
    </button>
  );
}
