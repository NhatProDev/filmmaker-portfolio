// External video (ADR-0008: EXTERNAL_VIDEO, CLICK_TO_PLAY only). Only YouTube
// and Vimeo, and only a video the provider's own player can show: the stored
// URL is reduced to the provider's video id, and the player address is built
// from that id alone — never from the stored URL — so nothing else can reach
// an iframe. The origins are the CSP's frame-src (security-headers.ts).

export type ExternalProvider = "youtube" | "vimeo";

export type ExternalVideoRef = { provider: ExternalProvider; id: string; hash?: string };

const YOUTUBE_HOSTS = ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtube-nocookie.com"];
const VIMEO_HOSTS = ["vimeo.com", "www.vimeo.com", "player.vimeo.com"];
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{1,12}$/;
const VIMEO_HASH = /^[0-9a-f]{6,20}$/;

function parseUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port ? url : null;
  } catch {
    return null;
  }
}

export function parseExternalVideo(provider: string, value: string): ExternalVideoRef | null {
  const url = parseUrl(value);
  if (!url) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  if (provider === "youtube") {
    if (!YOUTUBE_HOSTS.includes(url.hostname)) return null;
    let id: string | null | undefined;
    if (url.hostname === "youtu.be") id = parts[0];
    else if (parts[0] === "watch") id = url.searchParams.get("v");
    else if (["embed", "shorts", "live", "v"].includes(parts[0] ?? "")) id = parts[1];
    return id && YOUTUBE_ID.test(id) ? { provider, id } : null;
  }
  if (provider === "vimeo") {
    if (!VIMEO_HOSTS.includes(url.hostname)) return null;
    // player.vimeo.com/video/<id>?h=<hash>, vimeo.com/<id>[/<hash>],
    // vimeo.com/channels/<name>/<id>, vimeo.com/groups/<name>/videos/<id>
    const at = url.hostname === "player.vimeo.com" ? (parts[0] === "video" ? 1 : -1) : parts.findIndex((part) => VIMEO_ID.test(part));
    const id = at >= 0 ? parts[at] : undefined;
    if (!id || !VIMEO_ID.test(id)) return null;
    const hash = url.searchParams.get("h") ?? (url.hostname !== "player.vimeo.com" ? parts[at + 1] : undefined);
    if (hash !== undefined && hash !== null && !VIMEO_HASH.test(hash)) return null;
    return hash ? { provider, id, hash } : { provider, id };
  }
  return null;
}

// The provider player, started by the visitor's act (so autoplay here is the
// click's own playback, with sound, as CLICK_TO_PLAY intends). YouTube's
// privacy-enhanced host sets no cookies before play; Vimeo is asked not to
// track.
export function embedUrl(ref: ExternalVideoRef): string {
  if (ref.provider === "youtube") {
    return `https://www.youtube-nocookie.com/embed/${ref.id}?autoplay=1&playsinline=1&rel=0`;
  }
  const hash = ref.hash ? `h=${ref.hash}&` : "";
  return `https://player.vimeo.com/video/${ref.id}?${hash}autoplay=1&dnt=1`;
}
