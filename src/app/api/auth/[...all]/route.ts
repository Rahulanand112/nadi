import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

/**
 * Mounts every Better Auth endpoint (sign-up, sign-in, sign-out, session
 * lookup, and so on) at /api/auth/*. This is the one place the app layer is
 * allowed to import the auth config directly, since it is Better Auth's own
 * wiring, not application business logic.
 */
export const { POST, GET } = toNextJsHandler(auth);
