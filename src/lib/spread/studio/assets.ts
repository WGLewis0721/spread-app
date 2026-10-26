/**
 * User-initiated photo import.
 *
 * Limits, EXIF orientation, and the resize are pure functions of bytes or RGBA.
 * A decoder and an encoder are passed in. The browser and iOS adapters are separate.
 * The stored AssetRef describes the upright derivative, so its orientation is 1.
 * Nothing here writes localStorage or the network.
 * Read against contract 432b7c245d9dae3e1eb9a18aac6ba6921f0158c6.
 */
import {
  parseAssetRef,
  STUDIO_FLAG,
  STUDIO_LIMITS,
  type AssetOrientation,
  type AssetRef,
} from "./contract.ts";
import { isStudioOpaqueId, type AssetByteStore } from "./assets-store.ts";
import { suggestPalette, type PaletteSuggestion } from "./palette.ts";

export const STUDIO_IMPORT_LIMITS = {
  sourceBytesMax: 20 * 1024 * 1024,
  sourcePixelsMax: 40_000_000,
  derivativeLongEdge: 2048,
} as const;

export const STUDIO_ASSET_MESSAGES = {
  disabled: "Customize is turned off.",
  cancelled: "Import cancelled. Nothing was saved.",
  tooLarge: "This image is over 20 MB. Choose a smaller photo.",
  derivativeTooLarge: "The prepared photo is still over 8 MB, so it was not saved.",
  tooManyPixels: "This image is over 40 megapixels. Choose a smaller photo.",
  invalid: "This file is not a JPEG, PNG, or WebP photo.",
  mime: "This file's type does not match its contents.",
  corrupt: "This photo could not be read. Nothing was saved.",
  storageFull: "There isn't enough room to keep this photo. Nothing was saved.",
  saveFailed: "The photo could not be saved. Your planner was not changed.",
  encodeFailed: "This photo could not be prepared. Nothing was saved.",
  missingProfile: "Choose a profile before importing a photo.",
} as const;

export type ImageHeader = {
  format: "jpeg" | "png" | "webp";
  width: number;
  height: number;
  orientation: AssetOrientation;
};

export type DecodedRaster = {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
};

export type RasterDecoder = {
  decode(bytes: Uint8Array, signal: AbortSignal): Promise<DecodedRaster | null>;
};

export type RasterEncoder = {
  encode(
    rgba: Uint8ClampedArray,
    width: number,
    height: number,
    format: "jpeg" | "webp",
  ): Promise<Uint8Array | null>;
};

export type StudioAssetFailure =
  | "disabled"
  | "cancelled"
  | "too-large"
  | "too-many-pixels"
  | "invalid"
  | "corrupt"
  | "storage-full"
  | "save-failed"
  | "encode-failed"
  | "missing-profile";

export type StudioAssetImport =
  | { ok: true; ref: AssetRef; suggestion: PaletteSuggestion }
  | { ok: false; reason: StudioAssetFailure; message: string };

const ORIENTATIONS: readonly AssetOrientation[] = [1, 2, 3, 4, 5, 6, 7, 8];

export function sourceByteStatus(byteLength: number): "ok" | "too-large" {
  if (!Number.isFinite(byteLength) || byteLength < 1) return "too-large";
  if (byteLength > STUDIO_IMPORT_LIMITS.sourceBytesMax) return "too-large";
  return "ok";
}

export function sourcePixelStatus(
  width: number,
  height: number,
): "ok" | "too-many-pixels" | "invalid" {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1)
    return "invalid";
  if (
    width > STUDIO_IMPORT_LIMITS.sourcePixelsMax ||
    height > STUDIO_IMPORT_LIMITS.sourcePixelsMax
  ) {
    return "too-many-pixels";
  }
  if (width > Math.floor(STUDIO_IMPORT_LIMITS.sourcePixelsMax / height)) return "too-many-pixels";
  return "ok";
}

export function derivativeFormat(source: ImageHeader["format"]): "jpeg" | "webp" {
  return source === "webp" ? "webp" : "jpeg";
}

export function derivativeSize(
  width: number,
  height: number,
  longEdge = STUDIO_IMPORT_LIMITS.derivativeLongEdge,
): { width: number; height: number } {
  if (width < 1 || height < 1) return { width: 1, height: 1 };
  const long = Math.max(width, height);
  if (long <= longEdge) return { width, height };
  if (width >= height) {
    return { width: longEdge, height: Math.max(1, Math.round((height * longEdge) / width)) };
  }
  return { width: Math.max(1, Math.round((width * longEdge) / height)), height: longEdge };
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  let text = "";
  for (let index = 0; index < length; index += 1)
    text += String.fromCharCode(bytes[offset + index] ?? 0);
  return text;
}

function u16be(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0);
}

function u32be(bytes: Uint8Array, offset: number): number {
  return (
    (((bytes[offset] ?? 0) << 24) |
      ((bytes[offset + 1] ?? 0) << 16) |
      ((bytes[offset + 2] ?? 0) << 8) |
      (bytes[offset + 3] ?? 0)) >>>
    0
  );
}

function u32le(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] ?? 0) |
      ((bytes[offset + 1] ?? 0) << 8) |
      ((bytes[offset + 2] ?? 0) << 16) |
      ((bytes[offset + 3] ?? 0) << 24)) >>>
    0
  );
}

function asOrientation(value: number): AssetOrientation | null {
  return ORIENTATIONS.includes(value as AssetOrientation) ? (value as AssetOrientation) : null;
}

/** TIFF orientation tag 0x0112. Returns null when the tag is absent or not 1–8. */
export function readTiffOrientation(
  bytes: Uint8Array,
  start: number,
  end: number,
): AssetOrientation | null {
  if (end - start < 8 || start < 0) return null;
  const little = bytes[start] === 0x49 && bytes[start + 1] === 0x49;
  const big = bytes[start] === 0x4d && bytes[start + 1] === 0x4d;
  if (!little && !big) return null;
  const u16 = (offset: number): number | null => {
    if (offset < start || offset + 2 > end) return null;
    const first = bytes[offset] ?? 0;
    const second = bytes[offset + 1] ?? 0;
    return little ? first | (second << 8) : (first << 8) | second;
  };
  const u32 = (offset: number): number | null => {
    if (offset < start || offset + 4 > end) return null;
    return little ? u32le(bytes, offset) : u32be(bytes, offset);
  };
  if (u16(start + 2) !== 42) return null;
  const ifdOffset = u32(start + 4);
  if (ifdOffset === null || ifdOffset > end - start) return null;
  const ifd = start + ifdOffset;
  const count = u16(ifd);
  if (count === null || count > 64) return null;
  for (let index = 0; index < count; index += 1) {
    const entry = ifd + 2 + index * 12;
    const tag = u16(entry);
    const type = u16(entry + 2);
    const size = u32(entry + 4);
    if (tag === null || type === null || size === null) return null;
    if (tag !== 0x0112 || type !== 3 || size !== 1) continue;
    const value = u16(entry + 8);
    return value === null ? null : asOrientation(value);
  }
  return null;
}

function readExifOrientation(
  bytes: Uint8Array,
  start: number,
  end: number,
): AssetOrientation | null {
  const marker = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00];
  if (end - start < marker.length + 8) return null;
  for (let index = 0; index < marker.length; index += 1) {
    if (bytes[start + index] !== marker[index]) return null;
  }
  return readTiffOrientation(bytes, start + marker.length, end);
}

function isSof(marker: number): boolean {
  return (
    (marker >= 0xc0 && marker <= 0xc3) ||
    (marker >= 0xc5 && marker <= 0xc7) ||
    (marker >= 0xc9 && marker <= 0xcb) ||
    (marker >= 0xcd && marker <= 0xcf)
  );
}

function readJpeg(bytes: Uint8Array): ImageHeader | null {
  let orientation: AssetOrientation = 1;
  let width = 0;
  let height = 0;
  let offset = 2;
  while (offset + 1 < bytes.length) {
    if (bytes[offset] !== 0xff)
      return width > 0 ? { format: "jpeg", width, height, orientation } : null;
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) break;
    const marker = bytes[offset] ?? 0;
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) return null;
    const length = u16be(bytes, offset);
    if (length < 2 || offset + length > bytes.length) return null;
    const segment = offset + 2;
    if (marker === 0xe1) {
      const found = readExifOrientation(bytes, segment, offset + length);
      if (found) orientation = found;
    } else if (isSof(marker) && length >= 7) {
      height = u16be(bytes, segment + 1);
      width = u16be(bytes, segment + 3);
    }
    offset += length;
  }
  if (width < 1 || height < 1) return null;
  return { format: "jpeg", width, height, orientation };
}

function readPng(bytes: Uint8Array): ImageHeader | null {
  if (bytes.length < 24 || ascii(bytes, 12, 4) !== "IHDR") return null;
  const width = u32be(bytes, 16);
  const height = u32be(bytes, 20);
  if (width < 1 || height < 1) return null;
  let orientation: AssetOrientation = 1;
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = u32be(bytes, offset);
    const type = ascii(bytes, offset + 4, 4);
    const data = offset + 8;
    if (data + length + 4 > bytes.length) break;
    if (type === "eXIf") {
      const found = readTiffOrientation(bytes, data, data + length);
      if (found) orientation = found;
    }
    if (type === "IEND") break;
    offset = data + length + 4;
  }
  return { format: "png", width, height, orientation };
}

function readVp8Size(
  bytes: Uint8Array,
  start: number,
  end: number,
): { width: number; height: number } | null {
  if (end - start < 10 || (bytes[start] & 1) !== 0) return null;
  if (bytes[start + 3] !== 0x9d || bytes[start + 4] !== 0x01 || bytes[start + 5] !== 0x2a)
    return null;
  const width = (bytes[start + 6] | (bytes[start + 7] << 8)) & 0x3fff;
  const height = (bytes[start + 8] | (bytes[start + 9] << 8)) & 0x3fff;
  if (width < 1 || height < 1) return null;
  return { width, height };
}

function readVp8lSize(
  bytes: Uint8Array,
  start: number,
  end: number,
): { width: number; height: number } | null {
  if (end - start < 5 || bytes[start] !== 0x2f) return null;
  const bits = u32le(bytes, start + 1);
  const width = (bits & 0x3fff) + 1;
  const height = ((bits >> 14) & 0x3fff) + 1;
  if (width < 1 || height < 1) return null;
  return { width, height };
}

function readWebp(bytes: Uint8Array): ImageHeader | null {
  let width = 0;
  let height = 0;
  let orientation: AssetOrientation = 1;
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const type = ascii(bytes, offset, 4);
    const size = u32le(bytes, offset + 4);
    const data = offset + 8;
    if (size > bytes.length || data + size > bytes.length) return null;
    if (type === "VP8X" && size >= 10) {
      width = 1 + (bytes[data + 4] | (bytes[data + 5] << 8) | (bytes[data + 6] << 16));
      height = 1 + (bytes[data + 7] | (bytes[data + 8] << 8) | (bytes[data + 9] << 16));
    } else if (type === "VP8 " && width === 0) {
      const dims = readVp8Size(bytes, data, data + size);
      if (dims) {
        width = dims.width;
        height = dims.height;
      }
    } else if (type === "VP8L" && width === 0) {
      const dims = readVp8lSize(bytes, data, data + size);
      if (dims) {
        width = dims.width;
        height = dims.height;
      }
    } else if (type === "EXIF") {
      const found = readTiffOrientation(bytes, data, data + size);
      if (found) orientation = found;
    }
    offset = data + size + (size & 1);
  }
  if (width < 1 || height < 1) return null;
  return { format: "webp", width, height, orientation };
}

function looksLikeText(bytes: Uint8Array): boolean {
  const sample = ascii(bytes, 0, Math.min(bytes.length, 64)).trimStart().toLowerCase();
  return (
    sample.startsWith("<svg") ||
    sample.startsWith("<?xml") ||
    sample.startsWith("<!doctype") ||
    sample.startsWith("<html")
  );
}

function magicKind(bytes: Uint8Array): "jpeg" | "png" | "webp" | "rejected" {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "jpeg";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP")
    return "webp";
  return "rejected";
}

/** JPEG, PNG, and WebP only. GIF, SVG, HEIC, and HTML are not a header. */
export function readImageHeader(bytes: Uint8Array): ImageHeader | null {
  const kind = magicKind(bytes);
  if (kind === "jpeg") return readJpeg(bytes);
  if (kind === "png") return readPng(bytes);
  if (kind === "webp") return readWebp(bytes);
  return null;
}

function mimeAgrees(format: ImageHeader["format"], mime: string | undefined): boolean {
  if (!mime) return true;
  const value = mime.toLowerCase().split(";")[0]?.trim() ?? "";
  if (value === "" || value === "application/octet-stream") return true;
  if (format === "jpeg") return value === "image/jpeg" || value === "image/jpg";
  if (format === "png") return value === "image/png";
  return value === "image/webp";
}

type Dest = { x: number; y: number; width: number; height: number };

function destOf(
  orientation: AssetOrientation,
  x: number,
  y: number,
  width: number,
  height: number,
): Dest {
  switch (orientation) {
    case 2:
      return { x: width - 1 - x, y, width, height };
    case 3:
      return { x: width - 1 - x, y: height - 1 - y, width, height };
    case 4:
      return { x, y: height - 1 - y, width, height };
    case 5:
      return { x: y, y: x, width: height, height: width };
    case 6:
      return { x: height - 1 - y, y: x, width: height, height: width };
    case 7:
      return { x: height - 1 - y, y: width - 1 - x, width: height, height: width };
    case 8:
      return { x: y, y: width - 1 - x, width: height, height: width };
    default:
      return { x, y, width, height };
  }
}

/** EXIF orientations 1–8. Pixels are copied; the source buffer is left alone. */
export function applyOrientation(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  orientation: AssetOrientation,
): { rgba: Uint8ClampedArray; width: number; height: number } | null {
  if (width < 1 || height < 1 || rgba.length !== width * height * 4) return null;
  const first = destOf(orientation, 0, 0, width, height);
  const out = new Uint8ClampedArray(first.width * first.height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dest = destOf(orientation, x, y, width, height);
      const from = (y * width + x) * 4;
      const to = (dest.y * dest.width + dest.x) * 4;
      out[to] = rgba[from];
      out[to + 1] = rgba[from + 1];
      out[to + 2] = rgba[from + 2];
      out[to + 3] = rgba[from + 3];
    }
  }
  return { rgba: out, width: first.width, height: first.height };
}

/** Area-average resize. Same input always yields the same bytes. Does not enlarge. */
export function resizeRgba(
  rgba: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number,
): Uint8ClampedArray | null {
  if (srcWidth < 1 || srcHeight < 1 || dstWidth < 1 || dstHeight < 1) return null;
  if (rgba.length !== srcWidth * srcHeight * 4) return null;
  if (srcWidth === dstWidth && srcHeight === dstHeight) return new Uint8ClampedArray(rgba);
  const dst = new Uint8ClampedArray(dstWidth * dstHeight * 4);
  for (let y = 0; y < dstHeight; y += 1) {
    const srcY0 = (y * srcHeight) / dstHeight;
    const srcY1 = ((y + 1) * srcHeight) / dstHeight;
    const yStart = Math.floor(srcY0);
    const yEnd = Math.min(srcHeight, Math.ceil(srcY1));
    for (let x = 0; x < dstWidth; x += 1) {
      const srcX0 = (x * srcWidth) / dstWidth;
      const srcX1 = ((x + 1) * srcWidth) / dstWidth;
      const xStart = Math.floor(srcX0);
      const xEnd = Math.min(srcWidth, Math.ceil(srcX1));
      let red = 0;
      let green = 0;
      let blue = 0;
      let alpha = 0;
      let weight = 0;
      for (let sy = yStart; sy < yEnd; sy += 1) {
        const yOverlap = Math.min(srcY1, sy + 1) - Math.max(srcY0, sy);
        if (yOverlap <= 0) continue;
        for (let sx = xStart; sx < xEnd; sx += 1) {
          const xOverlap = Math.min(srcX1, sx + 1) - Math.max(srcX0, sx);
          if (xOverlap <= 0) continue;
          const area = xOverlap * yOverlap;
          const index = (sy * srcWidth + sx) * 4;
          red += rgba[index] * area;
          green += rgba[index + 1] * area;
          blue += rgba[index + 2] * area;
          alpha += rgba[index + 3] * area;
          weight += area;
        }
      }
      const index = (y * dstWidth + x) * 4;
      if (weight <= 0) continue;
      dst[index] = Math.round(red / weight);
      dst[index + 1] = Math.round(green / weight);
      dst[index + 2] = Math.round(blue / weight);
      dst[index + 3] = Math.round(alpha / weight);
    }
  }
  return dst;
}

/** JPEG and WebP have no alpha. Composite onto white so a transparent pixel does not turn black. */
export function flattenOnWhite(rgba: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba.length);
  for (let index = 0; index < rgba.length; index += 4) {
    const alpha = (rgba[index + 3] ?? 0) / 255;
    out[index] = Math.round((rgba[index] ?? 0) * alpha + 255 * (1 - alpha));
    out[index + 1] = Math.round((rgba[index + 1] ?? 0) * alpha + 255 * (1 - alpha));
    out[index + 2] = Math.round((rgba[index + 2] ?? 0) * alpha + 255 * (1 - alpha));
    out[index + 3] = 255;
  }
  return out;
}

export function createStudioAssetId(random: Uint8Array): string {
  let id = "a";
  const view = random.length >= 8 ? random.subarray(0, 8) : random;
  for (const byte of view) id += byte.toString(16).padStart(2, "0");
  return id;
}

function defaultAssetId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return createStudioAssetId(bytes);
}

function fail(reason: StudioAssetFailure, message: string): StudioAssetImport {
  return { ok: false, reason, message };
}

function uprightSize(header: ImageHeader): { width: number; height: number } {
  if (header.orientation >= 5) return { width: header.height, height: header.width };
  return { width: header.width, height: header.height };
}

/**
 * Validate, orient, resize, and store one derivative.
 * Does not write appearance JSON. A cancelled or failed import leaves the byte store unchanged.
 * Studio off (the default) returns before the decoder runs.
 */
export async function importStudioImage(input: {
  profileId: string;
  bytes: Uint8Array;
  mime?: string;
  signal?: AbortSignal;
  decoder: RasterDecoder;
  encoder: RasterEncoder;
  store: AssetByteStore;
  enabled?: boolean;
  createId?: () => string;
}): Promise<StudioAssetImport> {
  const enabled = input.enabled ?? STUDIO_FLAG;
  const debugStage = (stage: string) => { if (import.meta.env?.DEV) console.debug(`[Studio import] ${stage}`); };
  if (!enabled) return fail("disabled", STUDIO_ASSET_MESSAGES.disabled);
  const signal = input.signal ?? new AbortController().signal;
  if (signal.aborted) return fail("cancelled", STUDIO_ASSET_MESSAGES.cancelled);
  if (!isStudioOpaqueId(input.profileId))
    return fail("missing-profile", STUDIO_ASSET_MESSAGES.missingProfile);
  if (sourceByteStatus(input.bytes.byteLength) === "too-large") {
    return fail("too-large", STUDIO_ASSET_MESSAGES.tooLarge);
  }
  const kind = magicKind(input.bytes);
  if (kind === "rejected" || looksLikeText(input.bytes))
    return fail("invalid", STUDIO_ASSET_MESSAGES.invalid);
  const header = readImageHeader(input.bytes);
  if (!header) return fail("corrupt", STUDIO_ASSET_MESSAGES.corrupt);
  if (!mimeAgrees(header.format, input.mime)) return fail("invalid", STUDIO_ASSET_MESSAGES.mime);
  if (sourcePixelStatus(header.width, header.height) === "too-many-pixels") {
    return fail("too-many-pixels", STUDIO_ASSET_MESSAGES.tooManyPixels);
  }
  if (signal.aborted) return fail("cancelled", STUDIO_ASSET_MESSAGES.cancelled);

  let decoded: DecodedRaster | null = null;
  try {
    debugStage("decode-start");
    decoded = await input.decoder.decode(input.bytes, signal);
    debugStage("decode-end");
  } catch {
    decoded = null;
  }
  if (signal.aborted) return fail("cancelled", STUDIO_ASSET_MESSAGES.cancelled);
  if (!decoded || decoded.rgba.length !== decoded.width * decoded.height * 4) {
    return fail("corrupt", STUDIO_ASSET_MESSAGES.corrupt);
  }
  if (sourcePixelStatus(decoded.width, decoded.height) !== "ok") {
    return fail("too-many-pixels", STUDIO_ASSET_MESSAGES.tooManyPixels);
  }

  const expected = uprightSize(header);
  let oriented: { rgba: Uint8ClampedArray; width: number; height: number } | null = null;
  if (decoded.width === header.width && decoded.height === header.height) {
    oriented = applyOrientation(decoded.rgba, decoded.width, decoded.height, header.orientation);
  } else if (
    decoded.width === expected.width &&
    decoded.height === expected.height &&
    header.orientation !== 1
  ) {
    oriented = {
      rgba: new Uint8ClampedArray(decoded.rgba),
      width: decoded.width,
      height: decoded.height,
    };
  }
  if (!oriented) return fail("corrupt", STUDIO_ASSET_MESSAGES.corrupt);

  const size = derivativeSize(oriented.width, oriented.height);
  const resized = resizeRgba(
    oriented.rgba,
    oriented.width,
    oriented.height,
    size.width,
    size.height,
  );
  if (!resized) return fail("corrupt", STUDIO_ASSET_MESSAGES.corrupt);
  debugStage("palette-start");
  const suggestion = suggestPalette(resized, size.width, size.height);
  debugStage("palette-end");
  const flat = flattenOnWhite(resized);
  const preferred = derivativeFormat(header.format);
  let format: "jpeg" | "webp" = preferred;
  let encoded: Uint8Array | null = null;
  try {
    debugStage("encode-start");
    encoded = await input.encoder.encode(flat, size.width, size.height, preferred);
    debugStage("encode-end");
  } catch {
    encoded = null;
  }
  if ((!encoded || encoded.byteLength < 1) && preferred === "webp") {
    format = "jpeg";
    try {
      encoded = await input.encoder.encode(flat, size.width, size.height, "jpeg");
    } catch {
      encoded = null;
    }
  }
  if (signal.aborted) return fail("cancelled", STUDIO_ASSET_MESSAGES.cancelled);
  if (!encoded || encoded.byteLength < 1)
    return fail("encode-failed", STUDIO_ASSET_MESSAGES.encodeFailed);
  if (encoded.byteLength > STUDIO_LIMITS.assetBytesMax) {
    return fail("too-large", STUDIO_ASSET_MESSAGES.derivativeTooLarge);
  }

  const id = (input.createId ?? defaultAssetId)();
  const ref = parseAssetRef({
    id,
    format,
    width: size.width,
    height: size.height,
    bytes: encoded.byteLength,
    orientation: 1,
  });
  if (!ref.ok) return fail("save-failed", STUDIO_ASSET_MESSAGES.saveFailed);

  debugStage("store-start");
  let stored: "ok" | "full" | "failed";
  try {
    stored = await input.store.put({
    id: ref.value.id,
    profileId: input.profileId,
    format,
    width: size.width,
    height: size.height,
    bytes: new Uint8Array(encoded),
    });
  } catch {
    // Native plugins and storage adapters can throw instead of returning "failed".
    // The editor must recover without hanging on its import spinner.
    return fail("save-failed", STUDIO_ASSET_MESSAGES.saveFailed);
  }
  debugStage("store-end");
  if (stored === "full") return fail("storage-full", STUDIO_ASSET_MESSAGES.storageFull);
  if (stored !== "ok") return fail("save-failed", STUDIO_ASSET_MESSAGES.saveFailed);
  return { ok: true, ref: ref.value, suggestion };
}
