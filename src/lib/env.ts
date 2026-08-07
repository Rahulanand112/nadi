import { z } from "zod";

/**
 * Environment variables, validated once at boot.
 *
 * Without this, a missing DATABASE_URL surfaces as an opaque Prisma connection
 * error somewhere deep in a request. With it, the app refuses to start and
 * tells you exactly which variable is missing.
 *
 * The auth variables were added here after a deployment where BETTER_AUTH_URL
 * still pointed at localhost. Because nothing validated it, the app started
 * happily and only failed later, at sign-up, with "Invalid origin" — a message
 * that says nothing about which variable is wrong. Validating it here turns
 * that into a startup failure naming the exact key.
 */
const envSchema = z
  .object({
    DATABASE_URL: z.string().url("DATABASE_URL must be a valid connection string"),
    DIRECT_URL: z.string().url().optional(),

    BETTER_AUTH_SECRET: z
      .string()
      .min(16, "BETTER_AUTH_SECRET must be a long random string"),
    BETTER_AUTH_URL: z
      .string()
      .url("BETTER_AUTH_URL must be a full URL, e.g. https://nadi-eight.vercel.app"),

    // Optional in development: the Inngest dev server runs without keys, so
    // requiring them would block local work for no benefit. Required in
    // production, enforced below, because there the background job cannot run
    // without them and a silent failure means reminders never arrive.
    INNGEST_EVENT_KEY: z.string().optional(),
    INNGEST_SIGNING_KEY: z.string().optional(),

    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV !== "production") return;

    for (const key of ["INNGEST_EVENT_KEY", "INNGEST_SIGNING_KEY"] as const) {
      if (!value[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required in production — reminders cannot run without it`,
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;
