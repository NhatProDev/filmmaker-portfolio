import { getMediaStorage } from "./media-storage";

// The one place a media reference becomes a public URL. A key is the file's
// path under the media root, such as "home/n1.mp4". The storage adapter owns
// the root: today it is the local, gitignored public/media/ directory, which
// Next.js serves at /media, unless MEDIA_PUBLIC_BASE_URL says otherwise. The
// static content passes keys now, and the database adapter passes stored keys.

export function assertMediaKey(key: string): void {
  if (!key || key.startsWith("/") || key.split("/").includes("..")) {
    throw new Error(`A media key is a relative path under the media root: ${key}`);
  }
}

export function mediaUrl(key: string): string {
  assertMediaKey(key);
  return getMediaStorage().publicUrl(key);
}

// The key behind a URL that mediaUrl produced; null for any other URL.
export function mediaKeyFromUrl(url: string): string | null {
  // The prefix comes from a real key: adapters may refuse an empty one (s3).
  const prefix = getMediaStorage().publicUrl("k").slice(0, -1);
  if (!url.startsWith(prefix)) return null;
  const key = url.slice(prefix.length);
  try {
    assertMediaKey(key);
  } catch {
    return null;
  }
  return key;
}
