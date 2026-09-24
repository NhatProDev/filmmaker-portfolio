// Verifies the storage configuration with two throwaway probe objects
// (docs/operations/runbook.md §5):
//
//   npm run storage:check
//
//   public probe    delivered through MEDIA_PUBLIC_BASE_URL
//   private probe   refused anonymously, on the S3 endpoint and at the public base
//                   delivered by a presigned GET
//                   refused with a tampered or an expired signature
//   CORS            a browser at SITE_URL may PUT to both buckets and GET the private one
//
// It writes only under _probe/ and private/_probe/, and deletes its probes
// afterwards. It touches no other object.

import { randomBytes } from "node:crypto";
import { serverEnv } from "@/lib/env/server-env";
import { presignS3 } from "@/lib/storage/s3-presign";

async function main() {
  const env = serverEnv();
  if (env.MEDIA_STORAGE_PROVIDER !== "s3") throw new Error("MEDIA_STORAGE_PROVIDER must be s3.");
  if (!env.SITE_URL) throw new Error("SITE_URL is required: CORS is checked for that origin.");
  const id = `${Date.now()}-${randomBytes(4).toString("hex")}`;
  const probes = {
    public: { bucket: env.S3_PUBLIC_BUCKET!, key: `_probe/${id}.txt` },
    private: { bucket: env.S3_PRIVATE_BUCKET!, key: `private/_probe/${id}.txt` },
  };
  const body = `storage check ${id}\n`;
  const sign = (method: string, probe: { bucket: string; key: string }, expiresInSeconds = 120, now?: Date) =>
    presignS3({
      method,
      location: {
        endpoint: env.S3_ENDPOINT!,
        bucket: probe.bucket,
        key: probe.key,
        region: env.S3_REGION,
        pathStyle: env.S3_FORCE_PATH_STYLE === "true",
      },
      credentials: { accessKeyId: env.S3_ACCESS_KEY_ID!, secretAccessKey: env.S3_SECRET_ACCESS_KEY! },
      expiresInSeconds,
      now,
    });

  let failures = 0;
  const check = (name: string, pass: boolean, detail: string) => {
    if (!pass) failures += 1;
    console.log(`${pass ? "ok  " : "FAIL"}  ${name.padEnd(46)} ${detail}`);
  };
  const status = async (url: string, init?: RequestInit) => {
    const response = await fetch(url, { redirect: "manual", ...init });
    return { status: response.status, text: await response.text(), headers: response.headers };
  };

  console.log(`STORAGE  ${new URL(env.S3_ENDPOINT!).host}  public=${probes.public.bucket}  private=${probes.private.bucket}`);
  console.log(`ORIGIN   ${env.SITE_URL}\n`);
  try {
    for (const probe of [probes.public, probes.private]) {
      const put = await status(sign("PUT", probe), { method: "PUT", headers: { "content-type": "text/plain" }, body });
      check(`write ${probe.bucket}/${probe.key.split("/")[0]}/…`, put.status === 200, `PUT ${put.status}`);
    }

    const publicUrl = `${env.MEDIA_PUBLIC_BASE_URL}/${probes.public.key}`;
    const pub = await status(publicUrl);
    check("public probe via the public base URL", pub.status === 200 && pub.text === body, `GET ${pub.status}`);

    const endpoint = env.S3_ENDPOINT!.replace(/\/$/, "");
    const anon = await status(`${endpoint}/${probes.private.bucket}/${probes.private.key}`);
    check("private probe, anonymous, S3 endpoint", anon.status >= 400 && anon.text !== body, `GET ${anon.status}`);
    const viaPublic = await status(`${env.MEDIA_PUBLIC_BASE_URL}/${probes.private.key}`);
    check("private probe, anonymous, public base URL", viaPublic.status === 404 || viaPublic.status === 403, `GET ${viaPublic.status}`);

    const signed = await status(sign("GET", probes.private));
    check("private probe, presigned GET", signed.status === 200 && signed.text === body, `GET ${signed.status}`);
    const tampered = sign("GET", probes.private).replace(/X-Amz-Signature=([0-9a-f])/, (_, c: string) => `X-Amz-Signature=${c === "0" ? "1" : "0"}`);
    const bad = await status(tampered);
    check("private probe, tampered signature", bad.status === 403, `GET ${bad.status}`);
    const expired = await status(sign("GET", probes.private, 60, new Date(Date.now() - 10 * 60 * 1000)));
    check("private probe, expired signature", expired.status === 403, `GET ${expired.status}`);

    for (const [probe, method] of [
      [probes.public, "PUT"],
      [probes.private, "PUT"],
      [probes.private, "GET"],
    ] as const) {
      const preflight = await status(sign(method, probe), {
        method: "OPTIONS",
        headers: { origin: env.SITE_URL, "access-control-request-method": method, "access-control-request-headers": "content-type" },
      });
      const allowed = preflight.headers.get("access-control-allow-origin");
      check(
        `CORS ${method} ${probe.bucket} from the site`,
        preflight.status < 300 && (allowed === env.SITE_URL || allowed === "*"),
        `OPTIONS ${preflight.status} allow-origin=${allowed ?? "none"}`,
      );
    }
    const foreign = await status(sign("PUT", probes.private), {
      method: "OPTIONS",
      headers: { origin: "https://attacker.example", "access-control-request-method": "PUT" },
    });
    check("CORS refuses a foreign origin", foreign.headers.get("access-control-allow-origin") === null, `OPTIONS ${foreign.status}`);
  } finally {
    for (const probe of [probes.public, probes.private]) {
      const removed = await fetch(sign("DELETE", probe), { method: "DELETE" });
      check(`remove ${probe.bucket} probe`, removed.status === 204 || removed.status === 200 || removed.status === 404, `DELETE ${removed.status}`);
    }
  }
  console.log(failures ? `\n${failures} check(s) failed.` : "\nStorage is configured as intended.");
  if (failures) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
