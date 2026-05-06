/**
 * Environment variable validation via zod.
 *
 * - Server-only variables MUST NEVER be prefixed with `NEXT_PUBLIC_`.
 * - Client-exposed variables MUST be prefixed with `NEXT_PUBLIC_`.
 * - Validation is lazy (runtime, on first access) so that `next build`
 *   does not throw when envs are injected later at deploy time.
 *
 * Usage:
 *   import { serverEnv } from "@/lib/env";  // server components / route handlers only
 *   import { clientEnv } from "@/lib/env";  // safe on both sides
 */
import { z } from "zod";

const serverSchema = z.object({
  PERSO_API_KEY: z.string().min(1, "PERSO_API_KEY is required"),
  PERSO_API_BASE_URL: z
    .string()
    .url()
    .default("https://api.perso.ai"),
  TURSO_URL: z.string().min(1, "TURSO_URL is required"),
  TURSO_AUTH_TOKEN: z.string().min(1, "TURSO_AUTH_TOKEN is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
  TOSS_SECRET_KEY: z.string().min(1).optional(),
  TOSS_API_BASE_URL: z.string().url().optional(),
  CRON_SECRET: z.string().min(1).optional(),
  OPERATIONS_ADMIN_EMAILS: z.string().optional(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_PERSO_FILE_BASE_URL: z
    .string()
    .url()
    .default("https://perso.ai"),
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z
    .string()
    .min(1, "NEXT_PUBLIC_GOOGLE_CLIENT_ID is required"),
});

type ServerEnv = z.infer<typeof serverSchema>;
type ClientEnv = z.infer<typeof clientSchema>;

let cachedServerEnv: ServerEnv | null = null;
let cachedClientEnv: ClientEnv | null = null;

function formatError(issues: z.ZodIssue[]): string {
  return issues
    .map((i) => `  - ${i.path.join(".") || "<root>"}: ${i.message}`)
    .join("\n");
}

/**
 * Server-only env accessor. Throws at call time (not at import time)
 * if required variables are missing or malformed.
 *
 * Never import this from a Client Component.
 */
export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;

  const parsed = serverSchema.safeParse({
    PERSO_API_KEY: process.env.PERSO_API_KEY,
    PERSO_API_BASE_URL: process.env.PERSO_API_BASE_URL,
    TURSO_URL: process.env.TURSO_URL,
    TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    TOSS_SECRET_KEY: process.env.TOSS_SECRET_KEY,
    TOSS_API_BASE_URL: process.env.TOSS_API_BASE_URL,
    CRON_SECRET: process.env.CRON_SECRET,
    OPERATIONS_ADMIN_EMAILS: process.env.OPERATIONS_ADMIN_EMAILS,
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid server environment variables:\n${formatError(parsed.error.issues)}`,
    );
  }

  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

/**
 * Client-safe env accessor. Safe to call from both server and client.
 * NEXT_PUBLIC_* variables are inlined by Next at build time, so we can
 * read them directly via `process.env.NEXT_PUBLIC_*`.
 */
export function getClientEnv(): ClientEnv {
  if (cachedClientEnv) return cachedClientEnv;

  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_PERSO_FILE_BASE_URL:
      process.env.NEXT_PUBLIC_PERSO_FILE_BASE_URL,
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid client environment variables:\n${formatError(parsed.error.issues)}`,
    );
  }

  cachedClientEnv = parsed.data;
  return cachedClientEnv;
}
