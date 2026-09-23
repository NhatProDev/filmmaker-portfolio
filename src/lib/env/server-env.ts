import { z } from "zod";

// Server configuration, validated before use. The site runs without a
// database: the static content adapter is the default, and DATABASE_URL is
// required only when the database adapter is selected. Pages are prerendered,
// so the adapter is chosen when `next build` runs.

const emptyAsUnset = (value: unknown) => (value === "" ? undefined : value);

const serverEnvSchema = z
  .object({
    SITE_CONTENT_ADAPTER: z.preprocess(emptyAsUnset, z.enum(["static", "db"]).default("static")),
    DATABASE_URL: z.preprocess(
      emptyAsUnset,
      z
        .string()
        .regex(/^postgres(ql)?:\/\//, "must be a postgres:// or postgresql:// connection URL")
        .optional(),
    ),
    DATABASE_POOL_MAX: z.preprocess(emptyAsUnset, z.coerce.number().int().min(1).max(50).optional()),
    // Named prepared statements. Set "false" behind a transaction-mode
    // connection pooler, where a session is shared between clients.
    DATABASE_PREPARE: z.preprocess(emptyAsUnset, z.enum(["true", "false"]).default("true")),
    // Where media keys are served from: a root-relative path or an https URL,
    // without a trailing slash. Unset, keys resolve under /media, as today.
    MEDIA_PUBLIC_BASE_URL: z.preprocess(
      emptyAsUnset,
      z
        .string()
        .regex(/^(\/[^/\s]|https:\/\/[^\s]+)[^\s]*$/, "must be a root-relative path or an https URL")
        .refine((value) => !value.endsWith("/"), "must not end with a slash")
        .default("/media"),
    ),
  })
  .superRefine((env, ctx) => {
    if (env.SITE_CONTENT_ADAPTER === "db" && !env.DATABASE_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "is required when SITE_CONTENT_ADAPTER=db",
      });
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid server environment:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}
