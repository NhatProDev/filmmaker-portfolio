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
        // postgres.js sends an unknown URL parameter to the server as a
        // run-time setting, and the server refuses channel_binding as one.
        // Providers' copy-paste strings include it (Neon).
        .refine((value) => !/[?&]channel_binding=/.test(value), "must not include channel_binding (postgres.js does not support it)")
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
    // Extra origins accepted by the CSRF check, comma-separated, for a site
    // served under more than one host name. The request's own origin is
    // always accepted.
    APP_ORIGINS: z.preprocess(
      emptyAsUnset,
      z
        .string()
        .transform((value) => value.split(",").map((origin) => origin.trim()).filter(Boolean))
        .pipe(z.array(z.url({ protocol: /^https?$/ }).refine((origin) => new URL(origin).origin === origin, "must be a bare origin")))
        .default([]),
    ),
    // Signs private-project access cookies (CLAUDE.md §11). Without it, no
    // private project can be unlocked.
    PROJECT_ACCESS_SECRET: z.preprocess(emptyAsUnset, z.string().min(32, "must be at least 32 characters").optional()),

    // The site's canonical origin, e.g. https://www.example.com. Used for
    // canonical links, the sitemap and Open Graph URLs. Read at build time.
    SITE_URL: z.preprocess(
      emptyAsUnset,
      z
        .url({ protocol: /^https?$/ })
        .refine((value) => new URL(value).origin === value, "must be a bare origin, without a path or trailing slash")
        .optional(),
    ),

    // Which client address the rate limits trust (src/lib/http/client-address.ts).
    // A platform header the hosting platform always overwrites, e.g. x-real-ip
    // on Vercel or cf-connecting-ip behind Cloudflare; or the number of
    // reverse proxies that append to X-Forwarded-For. With neither, forwarded
    // headers are ignored.
    CLIENT_IP_HEADER: z.preprocess(
      emptyAsUnset,
      z
        .string()
        .regex(/^[A-Za-z0-9-]{1,64}$/, "must be a header name")
        .transform((value) => value.toLowerCase())
        .optional(),
    ),
    TRUSTED_PROXY_HOPS: z.preprocess(emptyAsUnset, z.coerce.number().int().min(0).max(5).default(0)),

    // The storage adapter (ADR-0014). "local" serves public keys from
    // public/media and private keys from MEDIA_PRIVATE_ROOT; "s3" is any
    // S3-compatible store (Cloudflare R2, AWS S3), with a public and a private
    // bucket.
    MEDIA_STORAGE_PROVIDER: z.preprocess(emptyAsUnset, z.enum(["local", "s3"]).default("local")),
    // Where the local adapter keeps private objects: a directory outside
    // public/, so Next.js never serves them. Relative to the working directory.
    MEDIA_PRIVATE_ROOT: z.preprocess(emptyAsUnset, z.string().min(1).default("storage/private")),
    S3_ENDPOINT: z.preprocess(emptyAsUnset, z.url({ protocol: /^https$/ }).optional()),
    S3_REGION: z.preprocess(emptyAsUnset, z.string().regex(/^[a-z0-9-]{1,32}$/).default("auto")),
    S3_PUBLIC_BUCKET: z.preprocess(emptyAsUnset, z.string().regex(/^[a-z0-9][a-z0-9.-]{1,62}$/).optional()),
    S3_PRIVATE_BUCKET: z.preprocess(emptyAsUnset, z.string().regex(/^[a-z0-9][a-z0-9.-]{1,62}$/).optional()),
    S3_ACCESS_KEY_ID: z.preprocess(emptyAsUnset, z.string().min(1).optional()),
    S3_SECRET_ACCESS_KEY: z.preprocess(emptyAsUnset, z.string().min(1).optional()),
    S3_FORCE_PATH_STYLE: z.preprocess(emptyAsUnset, z.enum(["true", "false"]).default("true")),
    // Have the provider verify each upload's SHA-256 (x-amz-checksum-sha256
    // on the signed PUT). Turn on only after both buckets' CORS allow that
    // header, or browsers cannot upload (docs/operations/media-lifecycle.md).
    S3_UPLOAD_CHECKSUMS: z.preprocess(emptyAsUnset, z.enum(["true", "false"]).default("false")),
    // Lifetime of a signed private delivery or upload URL.
    MEDIA_SIGNED_URL_TTL_SECONDS: z.preprocess(emptyAsUnset, z.coerce.number().int().min(30).max(3600).default(300)),

    // Reserved for a hosted video provider (Mux, Cloudflare Stream). V1 serves
    // plain MP4 through storage; any other value is refused until implemented.
    VIDEO_PROVIDER: z.preprocess(
      emptyAsUnset,
      z.enum(["none"], { message: "only \"none\" is implemented in V1; video is plain MP4 through storage" }).default("none"),
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
    if (env.MEDIA_STORAGE_PROVIDER === "s3") {
      for (const key of ["S3_ENDPOINT", "S3_PUBLIC_BUCKET", "S3_PRIVATE_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"] as const) {
        if (!env[key]) ctx.addIssue({ code: "custom", path: [key], message: "is required when MEDIA_STORAGE_PROVIDER=s3" });
      }
      if (env.S3_PUBLIC_BUCKET && env.S3_PUBLIC_BUCKET === env.S3_PRIVATE_BUCKET) {
        ctx.addIssue({ code: "custom", path: ["S3_PRIVATE_BUCKET"], message: "must differ from S3_PUBLIC_BUCKET" });
      }
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

const isLocalDatabaseUrl = (url: string) => ["", "localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname);

// What a public production deployment needs beyond a valid environment
// (docs/operations/environment.md). Local production builds may leave these
// unset; `npm run env:check -- --production` refuses to pass without them.
export function productionIssues(env: ServerEnv): string[] {
  const issues: string[] = [];
  if (!env.SITE_URL) issues.push("SITE_URL is required: canonical links and the sitemap need the public origin");
  else if (!env.SITE_URL.startsWith("https://")) issues.push("SITE_URL must be https in production");
  if (env.SITE_CONTENT_ADAPTER !== "db") issues.push("SITE_CONTENT_ADAPTER must be db: the Studio publishes to the database");
  // postgres.js encrypts with sslmode=require but verifies the server's
  // certificate only with verify-full.
  if (env.DATABASE_URL && !isLocalDatabaseUrl(env.DATABASE_URL) && new URL(env.DATABASE_URL).searchParams.get("sslmode") !== "verify-full") {
    issues.push("DATABASE_URL must use sslmode=verify-full: other modes do not verify the database server's certificate");
  }
  if (!env.PROJECT_ACCESS_SECRET) issues.push("PROJECT_ACCESS_SECRET is required: private projects cannot be unlocked without it");
  if (!env.CLIENT_IP_HEADER && env.TRUSTED_PROXY_HOPS === 0) {
    issues.push("CLIENT_IP_HEADER or TRUSTED_PROXY_HOPS is required: without either, every visitor shares one rate-limit address");
  }
  if (env.MEDIA_STORAGE_PROVIDER !== "s3") {
    issues.push("MEDIA_STORAGE_PROVIDER must be s3: the local adapter keeps media on the server's disk and cannot upload");
  }
  if (env.MEDIA_PUBLIC_BASE_URL.startsWith("/")) {
    issues.push("MEDIA_PUBLIC_BASE_URL must be the CDN's https origin: public media are not deployed with the app");
  }
  return issues;
}
