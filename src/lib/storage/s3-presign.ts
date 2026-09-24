import { createHash, createHmac } from "node:crypto";

// AWS Signature Version 4 query-string presigning for S3-compatible storage
// (AWS S3, Cloudflare R2, MinIO), with no SDK: a presigned URL lets a browser
// upload or fetch one object directly for a bounded time, so large media
// never pass through the application server (CLAUDE.md §12, ADR-0014).
// The host header is always signed, plus any headers the caller names (the
// requester must then send exactly those values). The payload is
// UNSIGNED-PAYLOAD: a signed x-amz-checksum-sha256 header is how the store is
// asked to verify the body (R2 refuses a mismatch with 400 BadDigest).

export type S3Location = {
  // e.g. https://<account>.r2.cloudflarestorage.com or https://s3.amazonaws.com
  endpoint: string;
  bucket: string;
  key: string;
  region: string;
  // Path style: <endpoint>/<bucket>/<key>; otherwise <bucket>.<endpoint host>/<key>.
  pathStyle: boolean;
};

export type S3Credentials = { accessKeyId: string; secretAccessKey: string };

// RFC 3986 encoding, as SigV4 requires (encodeURIComponent leaves !'()* alone).
const encode = (value: string) =>
  encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

const sha256 = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");
const hmac = (key: Buffer | string, value: string) => createHmac("sha256", key).update(value, "utf8").digest();

const amzDate = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function presignS3(input: {
  method: string;
  location: S3Location;
  credentials: S3Credentials;
  expiresInSeconds: number;
  // Extra headers bound into the signature, by lower-case name.
  headers?: Record<string, string>;
  // Extra query parameters, e.g. for a bucket listing (list-type=2).
  query?: Record<string, string>;
  now?: Date;
}): string {
  const { method, location, credentials, expiresInSeconds } = input;
  if (!Number.isInteger(expiresInSeconds) || expiresInSeconds < 1 || expiresInSeconds > 604800) {
    throw new Error("A presigned URL expires after 1 second to 7 days");
  }
  const endpoint = new URL(location.endpoint);
  const host = location.pathStyle ? endpoint.host : `${location.bucket}.${endpoint.host}`;
  // An empty key addresses the bucket itself (a listing).
  const segments = location.key ? location.key.split("/") : [];
  const path = (location.pathStyle ? [location.bucket, ...segments] : segments).map(encode).join("/");
  const canonicalUri = `/${path}`;

  const timestamp = amzDate(input.now ?? new Date());
  const day = timestamp.slice(0, 8);
  const scope = `${day}/${location.region}/s3/aws4_request`;
  const signed: Record<string, string> = { host };
  for (const [name, value] of Object.entries(input.headers ?? {})) {
    if (name !== name.toLowerCase() || name === "host") throw new Error(`Not a signable header name: ${name}`);
    signed[name] = value.trim();
  }
  const names = Object.keys(signed).sort();
  const signedHeaders = names.join(";");
  const query: [string, string][] = [
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", `${credentials.accessKeyId}/${scope}`],
    ["X-Amz-Date", timestamp],
    ["X-Amz-Expires", String(expiresInSeconds)],
    ["X-Amz-SignedHeaders", signedHeaders],
    ...Object.entries(input.query ?? {}),
  ];
  const canonicalQuery = query
    .map(([k, v]) => [encode(k), encode(v)])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  const canonicalHeaders = names.map((name) => `${name}:${signed[name]}\n`).join("");
  const canonicalRequest = [method, canonicalUri, canonicalQuery, canonicalHeaders, signedHeaders, "UNSIGNED-PAYLOAD"].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", timestamp, scope, sha256(canonicalRequest)].join("\n");
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${credentials.secretAccessKey}`, day), location.region), "s3"), "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");

  return `${endpoint.protocol}//${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}
