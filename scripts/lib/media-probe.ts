import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";

// Reads what an import needs from a local media file without changing it:
// size, SHA-256, MIME type, and the dimensions (and, for MP4, the duration)
// from the file's own headers.

export type ProbedMedia =
  | {
      exists: true;
      path: string;
      byteSize: number;
      sha256: string;
      mimeType: string;
      width: number | null;
      height: number | null;
      durationMs: number | null;
    }
  | { exists: false; path: string };

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

export async function probeMediaFile(path: string): Promise<ProbedMedia> {
  let bytes: Buffer;
  try {
    bytes = await readFile(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { exists: false, path };
    throw error;
  }
  const mimeType = MIME_TYPES[extname(path).toLowerCase()] ?? "application/octet-stream";
  const info: { width: number; height: number; durationMs?: number } | null =
    mimeType === "image/jpeg" ? jpegInfo(bytes) : mimeType === "video/mp4" ? mp4Info(bytes) : null;
  return {
    exists: true,
    path,
    byteSize: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    mimeType,
    width: info?.width ?? null,
    height: info?.height ?? null,
    durationMs: info?.durationMs ?? null,
  };
}

// The frame size from the first start-of-frame marker.
export function jpegInfo(bytes: Buffer): { width: number; height: number } | null {
  if (bytes.readUInt16BE(0) !== 0xffd8) return null;
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    // Standalone markers carry no length.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }
    const length = bytes.readUInt16BE(offset + 2);
    const isStartOfFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isStartOfFrame) {
      return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

type Box = { type: string; start: number; end: number };

function* boxes(bytes: Buffer, start: number, end: number): Generator<Box> {
  let offset = start;
  while (offset + 8 <= end) {
    let size = bytes.readUInt32BE(offset);
    const type = bytes.toString("latin1", offset + 4, offset + 8);
    let header = 8;
    if (size === 1) {
      size = Number(bytes.readBigUInt64BE(offset + 8));
      header = 16;
    } else if (size === 0) {
      size = end - offset;
    }
    if (size < header || offset + size > end) return;
    yield { type, start: offset + header, end: offset + size };
    offset += size;
  }
}

const child = (bytes: Buffer, parent: Box, type: string) =>
  [...boxes(bytes, parent.start, parent.end)].find((box) => box.type === type);

// Duration from mvhd; frame size from the tkhd of the video track.
export function mp4Info(bytes: Buffer): { width: number; height: number; durationMs: number } | null {
  const moov = [...boxes(bytes, 0, bytes.length)].find((box) => box.type === "moov");
  if (!moov) return null;
  const mvhd = child(bytes, moov, "mvhd");
  if (!mvhd) return null;
  const v1 = bytes[mvhd.start] === 1;
  const timescale = bytes.readUInt32BE(mvhd.start + (v1 ? 20 : 12));
  const duration = v1 ? Number(bytes.readBigUInt64BE(mvhd.start + 24)) : bytes.readUInt32BE(mvhd.start + 16);

  for (const trak of boxes(bytes, moov.start, moov.end)) {
    if (trak.type !== "trak") continue;
    const mdia = child(bytes, trak, "mdia");
    const hdlr = mdia && child(bytes, mdia, "hdlr");
    if (!hdlr || bytes.toString("latin1", hdlr.start + 8, hdlr.start + 12) !== "vide") continue;
    const tkhd = child(bytes, trak, "tkhd");
    if (!tkhd) return null;
    const at = tkhd.start + (bytes[tkhd.start] === 1 ? 88 : 76);
    return {
      width: Math.round(bytes.readUInt32BE(at) / 65536),
      height: Math.round(bytes.readUInt32BE(at + 4) / 65536),
      durationMs: Math.round((duration / timescale) * 1000),
    };
  }
  return null;
}
