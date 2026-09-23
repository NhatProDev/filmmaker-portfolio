// The one place a media reference becomes a public URL. A key is the file's
// path under the media root, such as "home/n1.mp4". Today the root is the
// local, gitignored public/media/ directory, which Next.js serves at /media.
// When media moves to object storage this function changes and its callers do
// not: the static content passes keys now, and a database adapter will pass
// stored keys.
const MEDIA_ROOT = "/media";

export function mediaUrl(key: string): string {
  if (key.startsWith("/") || key.split("/").includes("..")) {
    throw new Error(`A media key is a relative path under the media root: ${key}`);
  }
  return `${MEDIA_ROOT}/${key}`;
}
