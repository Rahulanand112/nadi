import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/server/db";
import { env } from "@/lib/env";

/**
 * Better Auth configuration.
 *
 * This file owns authentication only -- who a person is, and whether they are
 * currently signed in. It knows nothing about workspaces, memberships, or
 * roles; those are Nadi's own domain concepts and live in the service layer
 * (src/server/services), not inside the auth library.
 *
 * Deliberately NOT using Better Auth's "organization" plugin here. That
 * plugin would give us workspaces and membership roles for free, but it also
 * means every future decision about how households and teams work (per-member
 * privacy, shared task visibility, leaderboard scoping) has to fit a generic
 * library's assumptions instead of the product's actual shape. See
 * docs/decisions.md for the longer version of this reasoning.
 */

/**
 * Origins allowed to make auth requests.
 *
 * baseURL alone covers production, but every preview deployment gets its own
 * generated hostname, so without this list auth fails on every branch build
 * with "Invalid origin" — which looks identical to a misconfigured production
 * URL and wastes an afternoon each time. VERCEL_URL is injected by Vercel per
 * deployment and is read directly rather than through env.ts because it does
 * not exist locally.
 */
function trustedOrigins(): string[] {
  const origins = [env.BETTER_AUTH_URL];

  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`);
  }

  if (env.NODE_ENV !== "production") {
    origins.push("http://localhost:3000");
  }

  return [...new Set(origins)];
}

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: trustedOrigins(),
});
