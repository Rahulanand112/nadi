import { createAuthClient } from "better-auth/react";

/**
 * Client-side auth hooks (useSession, signIn, signUp, signOut) for use in
 * Client Components. Talks to the route handler at /api/auth/*.
 */
export const authClient = createAuthClient();

export const { useSession, signIn, signUp, signOut } = authClient;
