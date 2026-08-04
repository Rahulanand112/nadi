import { z } from "zod";

/**
 * Environment variables, validated once at boot.
 *
 * Without this, a missing DATABASE_URL surfaces as an opaque Prisma connection
 * error somewhere deep in a request. With it, the app refuses to start and
 * tells you exactly which variable is missing.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid connection string"),
  DIRECT_URL: z.string().url().optional(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;
