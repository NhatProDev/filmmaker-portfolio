// Uploads the media a manifest lists to S3-compatible storage
// (docs/operations/media-migration.md §3).
//
//   npm run media:upload -- --manifest=manifest.json                    dry run
//   npm run media:upload -- --manifest=manifest.json --apply            upload
//   npm run media:upload -- --manifest=manifest.json --verify-delivery  read back
//
// Create-only and idempotent: an object already in storage with the same size
// and MD5 is left alone; one with other bytes is reported as a conflict and
// never overwritten. Before each upload the file's SHA-256 must still match
// the manifest; after it, storage must report the same size and MD5.
// --verify-delivery fetches every public object through MEDIA_PUBLIC_BASE_URL
// and compares its SHA-256, Content-Type and, for video, a byte range.
// Nothing local is moved, deleted or re-encoded.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { serverEnv } from "@/lib/env/server-env";
import { presignS3 } from "@/lib/storage/s3-presign";
import type { MediaManifest } from "./lib/media-manifest";
import { decideUpload, uploadItems, type RemoteObject, type UploadItem } from "./lib/media-upload";

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const flag = (name: string) => process.argv.includes(`--${name}`);
const digest = (algorithm: "md5" | "sha256", bytes: Buffer) => createHash(algorithm).update(bytes).digest("hex");

async function main() {
  const manifestPath = arg("manifest");
  if (!manifestPath) throw new Error("--manifest=<file> is required (npm run media:manifest -- --out=<file>).");
  const env = serverEnv();
  if (env.MEDIA_STORAGE_PROVIDER !== "s3") throw new Error("MEDIA_STORAGE_PROVIDER must be s3.");

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as MediaManifest;
  const { items, problems } = uploadItems(manifest);
  if (problems.length) throw new Error(`The manifest cannot be uploaded:\n  ${problems.join("\n  ")}`);

  const buckets = { public: env.S3_PUBLIC_BUCKET!, private: env.S3_PRIVATE_BUCKET! };
  const sign = (method: string, item: UploadItem, expiresInSeconds = 300) =>
    presignS3({
      method,
      location: {
        endpoint: env.S3_ENDPOINT!,
        bucket: buckets[item.bucket],
        key: item.key,
        region: env.S3_REGION,
        pathStyle: env.S3_FORCE_PATH_STYLE === "true",
      },
      credentials: { accessKeyId: env.S3_ACCESS_KEY_ID!, secretAccessKey: env.S3_SECRET_ACCESS_KEY! },
      expiresInSeconds,
    });
  const head = async (item: UploadItem): Promise<RemoteObject> => {
    const response = await fetch(sign("HEAD", item), { method: "HEAD" });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Storage answered ${response.status} for HEAD ${item.bucket}:${item.key}`);
    return { byteSize: Number(response.headers.get("content-length") ?? -1), etag: response.headers.get("etag") };
  };

  console.log(`STORAGE  ${new URL(env.S3_ENDPOINT!).host}  public=${buckets.public}  private=${buckets.private}`);
  console.log(`MANIFEST ${manifestPath}  ${items.length} object(s)\n`);

  const apply = flag("apply");
  const counts = { upload: 0, unchanged: 0, conflict: 0, uploaded: 0 };
  for (const item of items) {
    const bytes = readFileSync(item.path);
    if (bytes.length !== item.byteSize || digest("sha256", bytes) !== item.sha256) {
      throw new Error(`${item.path} changed since the manifest was written; regenerate it.`);
    }
    const md5 = digest("md5", bytes);
    const decision = decideUpload({ byteSize: bytes.length, md5 }, await head(item));
    counts[decision] += 1;
    const where = `${item.bucket}:${item.key}`;
    if (decision !== "upload" || !apply) {
      console.log(`${decision.padEnd(9)} ${where}  ${(bytes.length / 1e6).toFixed(1)} MB`);
      continue;
    }
    const response = await fetch(sign("PUT", item), {
      method: "PUT",
      headers: { "content-type": item.mimeType, "cache-control": item.cacheControl },
      body: bytes,
    });
    if (!response.ok) throw new Error(`Storage answered ${response.status} for PUT ${where}: ${await response.text()}`);
    if (decideUpload({ byteSize: bytes.length, md5 }, await head(item)) !== "unchanged") {
      throw new Error(`${where} did not verify after upload`);
    }
    counts.uploaded += 1;
    console.log(`uploaded  ${where}  ${(bytes.length / 1e6).toFixed(1)} MB  md5 verified`);
  }

  console.log(
    `\n${apply ? "APPLIED" : "DRY RUN"}  to upload ${counts.upload} · unchanged ${counts.unchanged} · conflict ${counts.conflict}` +
      (apply ? ` · uploaded ${counts.uploaded}` : ""),
  );
  if (!apply && counts.upload) console.log("Nothing written. Re-run with --apply to upload the objects above.");
  if (counts.conflict) {
    console.log("Conflicting objects hold other bytes under the same key; they were not touched.");
    process.exitCode = 2;
  }

  if (flag("verify-delivery")) await verifyDelivery(items, env.MEDIA_PUBLIC_BASE_URL);
}

// Reads every public object back through its public URL.
async function verifyDelivery(items: UploadItem[], baseUrl: string) {
  if (!/^https:\/\//.test(baseUrl)) throw new Error("MEDIA_PUBLIC_BASE_URL must be an https URL to verify delivery.");
  console.log(`\nDELIVERY ${baseUrl}`);
  let failures = 0;
  for (const item of items.filter((i) => i.bucket === "public")) {
    const url = `${baseUrl}/${item.key.split("/").map(encodeURIComponent).join("/")}`;
    const response = await fetch(url);
    const bytes = Buffer.from(await response.arrayBuffer());
    const issues: string[] = [];
    if (response.status !== 200) issues.push(`status ${response.status}`);
    else if (digest("sha256", bytes) !== item.sha256) issues.push("sha256 differs");
    if (response.headers.get("content-type") !== item.mimeType) issues.push(`content-type ${response.headers.get("content-type")}`);
    if (item.mimeType.startsWith("video/")) {
      const range = await fetch(url, { headers: { range: "bytes=0-1023" } });
      const length = (await range.arrayBuffer()).byteLength;
      if (range.status !== 206 || length !== 1024) issues.push(`range ${range.status}/${length}`);
    }
    if (issues.length) failures += 1;
    console.log(`${issues.length ? "FAIL" : "ok  "}  ${item.key}  ${issues.join(", ")}`);
  }
  console.log(failures ? `\n${failures} object(s) failed delivery.` : "\nEvery public object is delivered intact.");
  if (failures) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
