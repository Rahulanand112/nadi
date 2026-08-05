import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/server/db";

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
export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
});
