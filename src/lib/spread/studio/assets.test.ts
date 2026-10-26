import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Directory } from "@capacitor/filesystem";
import { STUDIO_FLAG, STUDIO_LIMITS, parseAssetRef, type AssetOrientation } from "./contract.ts";
import {
  STUDIO_ASSET_MESSAGES,
  STUDIO_IMPORT_LIMITS,
  applyOrientation,
  createStudioAssetId,
  derivativeSize,
  flattenOnWhite,
  importStudioImage,
  readImageHeader,
  resizeRgba,
  sourceByteStatus,
  sourcePixelStatus,
  type RasterDecoder,
  type RasterEncoder,
} from "./assets.ts";
import {
  assetStoreFromDb,
  isStudioOpaqueId,
  type AssetDb,
  type AssetRecord,
} from "./assets-store.ts";
import {
  base64ToBytes,
  bytesToBase64,
  createFileAssetStore,
  studioAssetFiles,
  studioAssetPath,
  type StudioFilesystem,
} from "./assets-ios.ts";

const SECRET = "EXIF-SECRET-MARKER";

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function solid(
  width: number,
  height: number,
  pixel: [number, number, number, number],
): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < rgba.length; index += 4) {
    rgba[index] = pixel[0];
    rgba[index + 1] = pixel[1];
    rgba[index + 2] = pixel[2];
    rgba[index + 3] = pixel[3];
  }
  return rgba;
}

function pixel(rgba: Uint8ClampedArray, width: number, x: number, y: number): number[] {
  const index = (y * width + x) * 4;
  return [rgba[index], rgba[index + 1], rgba[index + 2], rgba[index + 3]];
}

function tiffOrientation(orientation: number): Uint8Array {
  const bytes = new Uint8Array(22);
  bytes[0] = 0x49;
  bytes[1] = 0x49;
  bytes[2] = 42;
  bytes[4] = 8;
  bytes[8] = 1;
  bytes[10] = 0x12;
  bytes[11] = 0x01;
  bytes[12] = 3;
  bytes[14] = 1;
  bytes[18] = orientation;
  return bytes;
}

function exifApp1(orientation: number): Uint8Array {
  const tiff = tiffOrientation(orientation);
  const length = 2 + 6 + tiff.length;
  const out = new Uint8Array(4 + 6 + tiff.length);
  out[0] = 0xff;
  out[1] = 0xe1;
  out[2] = length >> 8;
  out[3] = length & 255;
  out.set([0x45, 0x78, 0x69, 0x66, 0x00, 0x00], 4);
  out.set(tiff, 10);
  return out;
}

function com(text: string): Uint8Array {
  const data = new TextEncoder().encode(text);
  const length = data.length + 2;
  const out = new Uint8Array(4 + data.length);
  out[0] = 0xff;
  out[1] = 0xfe;
  out[2] = length >> 8;
  out[3] = length & 255;
  out.set(data, 4);
  return out;
}

function sof(width: number, height: number): Uint8Array {
  return new Uint8Array([
    0xff,
    0xc0,
    0x00,
    0x0b,
    0x08,
    (height >> 8) & 255,
    height & 255,
    (width >> 8) & 255,
    width & 255,
    0x01,
    0x01,
    0x11,
    0x00,
  ]);
}

function jpeg(width: number, height: number, orientation = 1, extra?: Uint8Array): Uint8Array {
  return concat(
    new Uint8Array([0xff, 0xd8]),
    exifApp1(orientation),
    extra ?? new Uint8Array(),
    sof(width, height),
    new Uint8Array([0xff, 0xd9]),
  );
}

function png(width: number, height: number): Uint8Array {
  const out = new Uint8Array(24);
  out.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  out[11] = 13;
  out.set([0x49, 0x48, 0x44, 0x52], 12);
  out[16] = (width >>> 24) & 255;
  out[17] = (width >>> 16) & 255;
  out[18] = (width >>> 8) & 255;
  out[19] = width & 255;
  out[20] = (height >>> 24) & 255;
  out[21] = (height >>> 16) & 255;
  out[22] = (height >>> 8) & 255;
  out[23] = height & 255;
  return out;
}

function webp(width: number, height: number): Uint8Array {
  const out = new Uint8Array(30);
  out.set([0x52, 0x49, 0x46, 0x46], 0);
  out[4] = 18;
  out.set([0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x58], 8);
  out[16] = 10;
  const w = width - 1;
  const h = height - 1;
  out[24] = w & 255;
  out[25] = (w >> 8) & 255;
  out[26] = (w >> 16) & 255;
  out[27] = h & 255;
  out[28] = (h >> 8) & 255;
  out[29] = (h >> 16) & 255;
  return out;
}

function memoryDb(fail?: "full" | "failed") {
  const rows = new Map<string, AssetRecord>();
  const db: AssetDb = {
    async put(record) {
      if (fail === "full") throw new DOMException("quota", "QuotaExceededError");
      if (fail === "failed") throw new Error("disk");
      rows.set(record.id, { ...record, bytes: new Uint8Array(record.bytes) });
    },
    async get(id) {
      const row = rows.get(id);
      return row ? { ...row, bytes: new Uint8Array(row.bytes) } : null;
    },
    async delete(id) {
      rows.delete(id);
    },
    async list() {
      return [...rows.values()].map((row) => ({ id: row.id, profileId: row.profileId }));
    },
  };
  return { db, rows, store: assetStoreFromDb(db) };
}

function countingDecoder(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  mode?: "throw" | "abort",
): {
  decoder: RasterDecoder;
  calls: { count: number };
} {
  const calls = { count: 0 };
  return {
    calls,
    decoder: {
      async decode(_bytes, signal) {
        calls.count += 1;
        if (mode === "throw") throw new Error("corrupt");
        if (mode === "abort") signal.throwIfAborted();
        return { width, height, rgba };
      },
    },
  };
}

function recordingEncoder(payload = Uint8Array.from([0xff, 0xd8, 1, 2])): {
  encoder: RasterEncoder;
  seen: Array<{ width: number; height: number; format: string; rgba: Uint8ClampedArray }>;
} {
  const seen: Array<{ width: number; height: number; format: string; rgba: Uint8ClampedArray }> =
    [];
  return {
    seen,
    encoder: {
      async encode(rgba, width, height, format) {
        seen.push({ width, height, format, rgba: new Uint8ClampedArray(rgba) });
        return payload;
      },
    },
  };
}

test("assets: orientation 1 through 8 maps a 2x2 fixture", () => {
  const src = new Uint8ClampedArray([
    255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255,
  ]);
  const expected: Record<AssetOrientation, number[][]> = {
    1: [
      [255, 0, 0, 255],
      [0, 255, 0, 255],
      [0, 0, 255, 255],
      [255, 255, 255, 255],
    ],
    2: [
      [0, 255, 0, 255],
      [255, 0, 0, 255],
      [255, 255, 255, 255],
      [0, 0, 255, 255],
    ],
    3: [
      [255, 255, 255, 255],
      [0, 0, 255, 255],
      [0, 255, 0, 255],
      [255, 0, 0, 255],
    ],
    4: [
      [0, 0, 255, 255],
      [255, 255, 255, 255],
      [255, 0, 0, 255],
      [0, 255, 0, 255],
    ],
    5: [
      [255, 0, 0, 255],
      [0, 0, 255, 255],
      [0, 255, 0, 255],
      [255, 255, 255, 255],
    ],
    6: [
      [0, 0, 255, 255],
      [255, 0, 0, 255],
      [255, 255, 255, 255],
      [0, 255, 0, 255],
    ],
    7: [
      [255, 255, 255, 255],
      [0, 255, 0, 255],
      [0, 0, 255, 255],
      [255, 0, 0, 255],
    ],
    8: [
      [0, 255, 0, 255],
      [255, 255, 255, 255],
      [255, 0, 0, 255],
      [0, 0, 255, 255],
    ],
  };
  for (const orientation of [1, 2, 3, 4, 5, 6, 7, 8] as const) {
    const turned = applyOrientation(src, 2, 2, orientation);
    assert.ok(turned, String(orientation));
    assert.equal(turned.width, orientation >= 5 ? 2 : 2);
    assert.equal(turned.height, orientation >= 5 ? 2 : 2);
    assert.deepEqual(
      [0, 1, 2, 3].map((index) =>
        pixel(turned.rgba, turned.width, index % 2, Math.floor(index / 2)),
      ),
      expected[orientation],
      String(orientation),
    );
  }
  assert.equal(applyOrientation(src, 2, 1, 1), null);
});

test("assets: resize is deterministic and does not enlarge", () => {
  assert.deepEqual(derivativeSize(4000, 2000), { width: 2048, height: 1024 });
  assert.deepEqual(derivativeSize(1000, 3000), { width: 683, height: 2048 });
  assert.deepEqual(derivativeSize(100, 50), { width: 100, height: 50 });
  const src = new Uint8ClampedArray([
    255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255,
  ]);
  const small = resizeRgba(src, 2, 2, 1, 1);
  assert.ok(small);
  assert.deepEqual([...small], [128, 128, 128, 255]);
  assert.deepEqual([...(resizeRgba(src, 2, 2, 1, 1) ?? [])], [...small]);
  const same = resizeRgba(src, 2, 2, 2, 2);
  assert.ok(same);
  assert.deepEqual([...same], [...src]);
  assert.notEqual(same, src);
  assert.equal(resizeRgba(src, 3, 3, 1, 1), null);
});

test("assets: flatten drops alpha onto white", () => {
  const flat = flattenOnWhite(
    new Uint8ClampedArray([0, 0, 255, 0, 0, 0, 255, 128, 0, 0, 255, 255]),
  );
  assert.deepEqual([...flat], [255, 255, 255, 255, 127, 127, 255, 255, 0, 0, 255, 255]);
});

test("assets: headers read size and EXIF orientation, and reject other formats", () => {
  const turned = readImageHeader(jpeg(4, 2, 6, com(SECRET)));
  assert.ok(turned);
  assert.equal(turned.format, "jpeg");
  assert.equal(turned.width, 4);
  assert.equal(turned.height, 2);
  assert.equal(turned.orientation, 6);
  assert.equal(readImageHeader(jpeg(8, 8, 1))?.orientation, 1);
  assert.deepEqual(readImageHeader(png(32, 16)), {
    format: "png",
    width: 32,
    height: 16,
    orientation: 1,
  });
  assert.deepEqual(readImageHeader(webp(320, 240)), {
    format: "webp",
    width: 320,
    height: 240,
    orientation: 1,
  });
  assert.equal(readImageHeader(new Uint8Array([0xff, 0xd8, 0xff, 0xd9])), null);
  assert.equal(readImageHeader(new TextEncoder().encode("GIF89a")), null);
  assert.equal(
    readImageHeader(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'>")),
    null,
  );
  const heic = new Uint8Array(16);
  heic.set(new TextEncoder().encode("ftypheic"), 4);
  assert.equal(readImageHeader(heic), null);
  assert.equal(sourceByteStatus(STUDIO_IMPORT_LIMITS.sourceBytesMax), "ok");
  assert.equal(sourceByteStatus(STUDIO_IMPORT_LIMITS.sourceBytesMax + 1), "too-large");
  assert.equal(sourcePixelStatus(8000, 5000), "ok");
  assert.equal(sourcePixelStatus(8000, 5001), "too-many-pixels");
});

test("assets: import orients before the derivative and strips the source marker", async () => {
  const raw = new Uint8ClampedArray(4 * 2 * 4);
  raw.set([9, 8, 7, 255], 4);
  raw.set([1, 2, 3, 255], 16);
  const { decoder, calls } = countingDecoder(raw, 4, 2);
  const { encoder, seen } = recordingEncoder();
  const { store, rows } = memoryDb();
  const source = jpeg(4, 2, 6, com(SECRET));
  assert.equal(new TextDecoder().decode(source).includes(SECRET), true);
  const result = await importStudioImage({
    profileId: "profile1",
    bytes: source,
    mime: "image/jpeg",
    decoder,
    encoder,
    store,
    enabled: true,
    createId: () => "asset-1",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(calls.count, 1);
  assert.equal(seen.length, 1);
  assert.deepEqual(
    seen.map((item) => ({ width: item.width, height: item.height, format: item.format })),
    [{ width: 2, height: 4, format: "jpeg" }],
  );
  assert.deepEqual(pixel(seen[0].rgba, 2, 0, 0), [1, 2, 3, 255]);
  assert.deepEqual(result.ref, {
    id: "asset-1",
    format: "jpeg",
    width: 2,
    height: 4,
    bytes: 4,
    orientation: 1,
  });
  assert.deepEqual(parseAssetRef(result.ref), { ok: true, value: result.ref });
  assert.equal(isStudioOpaqueId(result.ref.id), true);
  const stored = rows.get("asset-1");
  assert.ok(stored);
  assert.deepEqual([...stored.bytes], [0xff, 0xd8, 1, 2]);
  assert.equal(new TextDecoder().decode(stored.bytes).includes(SECRET), false);
  assert.equal(stored.profileId, "profile1");
  assert.equal(await store.get("otherpro", "asset-1"), null);
});

test("assets: a decoder that already oriented the pixels is not rotated again", async () => {
  const upright = solid(2, 4, [4, 5, 6, 255]);
  upright.set([9, 9, 9, 255], 0);
  const { decoder } = countingDecoder(upright, 2, 4);
  const { encoder, seen } = recordingEncoder();
  const { store } = memoryDb();
  const result = await importStudioImage({
    profileId: "profile1",
    bytes: jpeg(4, 2, 6),
    decoder,
    encoder,
    store,
    enabled: true,
    createId: () => "asset-2",
  });
  assert.equal(result.ok, true);
  assert.equal(seen[0]?.width, 2);
  assert.equal(seen[0]?.height, 4);
  assert.equal(seen[0]?.rgba[0], 9);
});

test("assets: webp input is re-encoded as webp, and falls back to jpeg", async () => {
  const rgba = solid(2, 2, [10, 20, 30, 255]);
  const { store } = memoryDb();
  const first = await importStudioImage({
    profileId: "profile1",
    bytes: webp(2, 2),
    mime: "image/webp",
    decoder: countingDecoder(rgba, 2, 2).decoder,
    encoder: recordingEncoder(Uint8Array.from([1, 2, 3])).encoder,
    store,
    enabled: true,
    createId: () => "web-1",
  });
  assert.equal(first.ok && first.ref.format, "webp");
  const formats: string[] = [];
  const second = await importStudioImage({
    profileId: "profile1",
    bytes: webp(2, 2),
    decoder: countingDecoder(rgba, 2, 2).decoder,
    encoder: {
      async encode(_rgba, _width, _height, format) {
        formats.push(format);
        return format === "webp" ? null : Uint8Array.from([9, 9, 9]);
      },
    },
    store,
    enabled: true,
    createId: () => "web-2",
  });
  assert.deepEqual(formats, ["webp", "jpeg"]);
  assert.equal(second.ok && second.ref.format, "jpeg");
});

test("assets: png input is re-encoded as jpeg", async () => {
  const { encoder, seen } = recordingEncoder();
  const { store } = memoryDb();
  const result = await importStudioImage({
    profileId: "profile1",
    bytes: png(2, 2),
    mime: "image/png",
    decoder: countingDecoder(solid(2, 2, [1, 2, 3, 255]), 2, 2).decoder,
    encoder,
    store,
    enabled: true,
    createId: () => "png-1",
  });
  assert.equal(seen[0]?.format, "jpeg");
  assert.equal(result.ok && result.ref.format, "jpeg");
});

test("assets: files over 20 MB or 40 megapixels never reach the decoder", async () => {
  const { decoder, calls } = countingDecoder(solid(1, 1, [0, 0, 0, 255]), 1, 1);
  const { encoder, seen } = recordingEncoder();
  const { store, rows } = memoryDb();
  const huge = await importStudioImage({
    profileId: "profile1",
    bytes: new Uint8Array(STUDIO_IMPORT_LIMITS.sourceBytesMax + 1),
    decoder,
    encoder,
    store,
    enabled: true,
  });
  assert.deepEqual(huge, {
    ok: false,
    reason: "too-large",
    message: STUDIO_ASSET_MESSAGES.tooLarge,
  });
  const pixels = await importStudioImage({
    profileId: "profile1",
    bytes: jpeg(8000, 5001),
    decoder,
    encoder,
    store,
    enabled: true,
  });
  assert.deepEqual(pixels, {
    ok: false,
    reason: "too-many-pixels",
    message: STUDIO_ASSET_MESSAGES.tooManyPixels,
  });
  assert.equal(calls.count, 0);
  assert.equal(seen.length, 0);
  assert.equal(rows.size, 0);
});

test("assets: invalid, corrupt, and mismatched files store nothing", async () => {
  const { store, rows } = memoryDb();
  const { encoder } = recordingEncoder();
  const run = async (bytes: Uint8Array, decoder: RasterDecoder, mime?: string) => {
    const result = await importStudioImage({
      profileId: "profile1",
      bytes,
      mime,
      decoder,
      encoder,
      store,
      enabled: true,
      createId: () => "asset-x",
    });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("expected a rejected import");
    return result.reason;
  };
  assert.equal(
    await run(
      new TextEncoder().encode("GIF89a"),
      countingDecoder(solid(1, 1, [0, 0, 0, 255]), 1, 1).decoder,
    ),
    "invalid",
  );
  assert.equal(
    await run(
      new TextEncoder().encode("<svg></svg>"),
      countingDecoder(solid(1, 1, [0, 0, 0, 255]), 1, 1).decoder,
    ),
    "invalid",
  );
  assert.equal(
    await run(jpeg(2, 2), countingDecoder(solid(2, 2, [0, 0, 0, 255]), 2, 2).decoder, "image/png"),
    "invalid",
  );
  assert.equal(
    await run(
      new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
      countingDecoder(solid(1, 1, [0, 0, 0, 255]), 1, 1).decoder,
    ),
    "corrupt",
  );
  assert.equal(
    await run(jpeg(2, 2), countingDecoder(solid(2, 2, [0, 0, 0, 255]), 2, 2, "throw").decoder),
    "corrupt",
  );
  assert.equal(
    await run(jpeg(2, 2), countingDecoder(solid(3, 3, [0, 0, 0, 255]), 3, 3).decoder),
    "corrupt",
  );
  assert.equal(rows.size, 0);
});

test("assets: cancel, storage-full, and save failure leave no asset", async () => {
  const rgba = solid(2, 2, [1, 2, 3, 255]);
  const early = new AbortController();
  early.abort();
  const { store, rows } = memoryDb();
  const cancelled = await importStudioImage({
    profileId: "profile1",
    bytes: jpeg(2, 2),
    signal: early.signal,
    decoder: countingDecoder(rgba, 2, 2).decoder,
    encoder: recordingEncoder().encoder,
    store,
    enabled: true,
  });
  assert.equal(cancelled.ok, false);
  if (!cancelled.ok) assert.equal(cancelled.reason, "cancelled");
  const controller = new AbortController();
  const mid = await importStudioImage({
    profileId: "profile1",
    bytes: jpeg(2, 2),
    signal: controller.signal,
    decoder: {
      async decode() {
        controller.abort();
        return { width: 2, height: 2, rgba };
      },
    },
    encoder: recordingEncoder().encoder,
    store,
    enabled: true,
  });
  assert.equal(mid.ok, false);
  if (!mid.ok) assert.equal(mid.message, STUDIO_ASSET_MESSAGES.cancelled);
  const full = await importStudioImage({
    profileId: "profile1",
    bytes: jpeg(2, 2),
    decoder: countingDecoder(rgba, 2, 2).decoder,
    encoder: recordingEncoder().encoder,
    store: memoryDb("full").store,
    enabled: true,
  });
  assert.equal(full.ok, false);
  if (!full.ok) assert.equal(full.reason, "storage-full");
  const failed = await importStudioImage({
    profileId: "profile1",
    bytes: jpeg(2, 2),
    decoder: countingDecoder(rgba, 2, 2).decoder,
    encoder: recordingEncoder().encoder,
    store: memoryDb("failed").store,
    enabled: true,
  });
  assert.equal(failed.ok, false);
  if (!failed.ok) assert.equal(failed.reason, "save-failed");
  const encoded = await importStudioImage({
    profileId: "profile1",
    bytes: jpeg(2, 2),
    decoder: countingDecoder(rgba, 2, 2).decoder,
    encoder: {
      async encode() {
        return null;
      },
    },
    store,
    enabled: true,
  });
  assert.equal(encoded.ok, false);
  if (!encoded.ok) assert.equal(encoded.reason, "encode-failed");
  const over = new Uint8Array(STUDIO_LIMITS.assetBytesMax + 1);
  const tooBig = await importStudioImage({
    profileId: "profile1",
    bytes: jpeg(2, 2),
    decoder: countingDecoder(rgba, 2, 2).decoder,
    encoder: {
      async encode() {
        return over;
      },
    },
    store,
    enabled: true,
  });
  assert.equal(tooBig.ok, false);
  if (!tooBig.ok) assert.equal(tooBig.reason, "too-large");
  const badId = await importStudioImage({
    profileId: "profile1",
    bytes: jpeg(2, 2),
    decoder: countingDecoder(rgba, 2, 2).decoder,
    encoder: recordingEncoder().encoder,
    store,
    enabled: true,
    createId: () => "../secret",
  });
  assert.equal(badId.ok, false);
  if (!badId.ok) assert.equal(badId.reason, "save-failed");
  assert.equal(rows.size, 0);
});

test("assets: throwing native file plugin is a recoverable save failure, not an unhandled rejection", async () => {
  const rgba = solid(2, 2, [50, 120, 200, 255]);
  const store = memoryDb().store;
  const result = await importStudioImage({
    profileId: "profile1",
    bytes: jpeg(2, 2),
    decoder: countingDecoder(rgba, 2, 2).decoder,
    encoder: recordingEncoder().encoder,
    store: {
      ...store,
      async put() { throw new Error("Native Filesystem.mkdir unavailable"); },
    },
    enabled: true,
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "save-failed");
    assert.equal(result.message, STUDIO_ASSET_MESSAGES.saveFailed);
  }
});

test("assets: the studio flag off does not decode or store", async () => {
  assert.equal(STUDIO_FLAG, false);
  const { decoder, calls } = countingDecoder(solid(2, 2, [1, 2, 3, 255]), 2, 2);
  const { store, rows } = memoryDb();
  const hidden = await importStudioImage({
    profileId: "profile1",
    bytes: jpeg(2, 2),
    decoder,
    encoder: recordingEncoder().encoder,
    store,
  });
  const explicit = await importStudioImage({
    profileId: "profile1",
    bytes: jpeg(2, 2),
    decoder,
    encoder: recordingEncoder().encoder,
    store,
    enabled: false,
  });
  assert.equal(hidden.ok, false);
  assert.equal(explicit.ok, false);
  if (!hidden.ok) assert.equal(hidden.reason, "disabled");
  assert.equal(calls.count, 0);
  assert.equal(rows.size, 0);
  const missing = await importStudioImage({
    profileId: "../nope",
    bytes: jpeg(2, 2),
    decoder,
    encoder: recordingEncoder().encoder,
    store,
    enabled: true,
  });
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.equal(missing.reason, "missing-profile");
});

test("assets: ids are opaque and base64 round-trips", () => {
  const id = createStudioAssetId(Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 255]));
  assert.equal(id, "a00010203040506ff");
  assert.equal(isStudioOpaqueId(id), true);
  assert.equal(studioAssetPath("profile1", id, "bin"), `studio-assets/profile1/${id}.bin`);
  assert.equal(studioAssetPath("../x", id, "bin"), null);
  assert.equal(studioAssetPath("profile1", "../x", "json"), null);
  for (const size of [1, 2, 3, 50, 256]) {
    const bytes = new Uint8Array(size);
    for (let index = 0; index < size; index += 1) bytes[index] = (index * 17 + 3) & 255;
    assert.deepEqual([...(base64ToBytes(bytesToBase64(bytes)) ?? [])], [...bytes]);
  }
  assert.equal(base64ToBytes("not base64!!!!"), null);
});

test("assets: the byte-store seam isolates profiles and reports a full disk", async () => {
  const { store, rows } = memoryDb();
  assert.equal(
    await store.put({
      id: "asset-1",
      profileId: "alpha",
      format: "jpeg",
      width: 2,
      height: 2,
      bytes: Uint8Array.from([1, 2, 3]),
    }),
    "ok",
  );
  assert.equal(await store.get("beta", "asset-1"), null);
  await store.delete("beta", "asset-1");
  assert.equal(rows.has("asset-1"), true);
  assert.deepEqual([...(await store.get("alpha", "asset-1"))!.bytes], [1, 2, 3]);
  const full = memoryDb("full").store;
  assert.equal(
    await full.put({
      id: "asset-2",
      profileId: "alpha",
      format: "jpeg",
      width: 1,
      height: 1,
      bytes: Uint8Array.from([1]),
    }),
    "full",
  );
  assert.deepEqual(await full.list(), []);
});

function fakeFiles() {
  const files = new Map<string, string>();
  const dirs = new Set<string>(["studio-assets"]);
  const writes: Array<{ path: string; directory?: string; recursive?: boolean; keys: string[] }> =
    [];
  let fail: "full" | "json" | null = null;
  const filesystem: StudioFilesystem<"LIBRARY_NO_CLOUD"> = {
    async writeFile(options) {
      writes.push({
        path: options.path,
        directory: options.directory,
        recursive: options.recursive,
        keys: Object.keys(options),
      });
      if (fail === "full") throw new DOMException("quota", "QuotaExceededError");
      if (fail === "json" && options.path.endsWith(".json")) throw new Error("json");
      files.set(options.path, options.data);
      return { uri: `file://${options.path}` };
    },
    async readFile(options) {
      const data = files.get(options.path);
      if (data === undefined) throw new Error("missing");
      return { data };
    },
    async deleteFile(options) {
      files.delete(options.path);
    },
    async mkdir(options) {
      if (options.path) dirs.add(options.path);
    },
    async readdir(options) {
      const prefix = options.path.endsWith("/") ? options.path : `${options.path}/`;
      const names = new Map<string, string>();
      for (const path of files.keys()) {
        if (!path.startsWith(prefix)) continue;
        const rest = path.slice(prefix.length);
        const name = rest.split("/")[0];
        if (!name) continue;
        names.set(name, rest.includes("/") ? "directory" : "file");
      }
      for (const dir of dirs) {
        if (!dir.startsWith(prefix)) continue;
        const rest = dir.slice(prefix.length);
        if (!rest || rest.includes("/")) continue;
        names.set(rest, "directory");
      }
      return { files: [...names].map(([name, type]) => ({ name, type })) };
    },
  };
  return {
    filesystem,
    files,
    writes,
    setFail(next: "full" | "json" | null) {
      fail = next;
    },
  };
}

test("assets: the iOS adapter uses Capacitor LibraryNoCloud and base64 without an encoding flag", async () => {
  assert.equal(Directory.LibraryNoCloud, "LIBRARY_NO_CLOUD");
  const fake = fakeFiles();
  const files = studioAssetFiles(fake.filesystem, Directory.LibraryNoCloud);
  const store = createFileAssetStore(files);
  const bytes = Uint8Array.from([0, 255, 16, 32, 7]);
  assert.equal(
    await store.put({
      id: "asset-1",
      profileId: "profile1",
      format: "jpeg",
      width: 2,
      height: 2,
      bytes,
    }),
    "ok",
  );
  assert.ok(fake.writes.length >= 2);
  for (const write of fake.writes) {
    assert.equal(write.directory, "LIBRARY_NO_CLOUD");
    assert.equal(write.keys.includes("encoding"), false);
    assert.equal(write.path.includes(".."), false);
  }
  const round = await store.get("profile1", "asset-1");
  assert.ok(round);
  assert.deepEqual([...round.bytes], [...bytes]);
  assert.equal(await store.get("profile2", "asset-1"), null);
  const sidecar = fake.files.get("studio-assets/profile1/asset-1.json");
  assert.ok(sidecar);
  const meta = JSON.parse(new TextDecoder().decode(base64ToBytes(sidecar) ?? new Uint8Array()));
  assert.deepEqual(Object.keys(meta).sort(), [
    "bytes",
    "format",
    "height",
    "id",
    "orientation",
    "profileId",
    "width",
  ]);
  assert.equal(meta.orientation, 1);
  assert.equal(JSON.stringify(meta).includes("data:image"), false);
  assert.deepEqual(await store.list(), [{ id: "asset-1", profileId: "profile1" }]);
  await store.delete("profile2", "asset-1");
  assert.equal(fake.files.has("studio-assets/profile1/asset-1.bin"), true);
  await store.delete("profile1", "asset-1");
  assert.equal(fake.files.size, 0);
  assert.equal(await files.write("../escape.bin", bytes), "failed");
  fake.setFail("full");
  assert.equal(
    await store.put({
      id: "asset-2",
      profileId: "profile1",
      format: "jpeg",
      width: 1,
      height: 1,
      bytes: Uint8Array.from([1]),
    }),
    "full",
  );
  fake.setFail("json");
  assert.equal(
    await store.put({
      id: "asset-3",
      profileId: "profile1",
      format: "webp",
      width: 1,
      height: 1,
      bytes: Uint8Array.from([2, 3]),
    }),
    "failed",
  );
  assert.equal(fake.files.has("studio-assets/profile1/asset-3.bin"), false);
  const source = readFileSync(new URL("./assets-ios.ts", import.meta.url), "utf8");
  assert.equal(source.includes('await import("@capacitor/filesystem")'), true);
  assert.equal(source.includes("Directory.LibraryNoCloud"), true);
  assert.equal(source.includes("encoding:"), false);
});

test("assets: studio modules do not write localStorage, fetch, or data-theme", () => {
  const pkg = JSON.parse(
    readFileSync(new URL("../../../../package.json", import.meta.url), "utf8"),
  ) as {
    dependencies: Record<string, string>;
  };
  assert.equal(pkg.dependencies["@capacitor/filesystem"], "8.1.4");
  for (const name of [
    "assets.ts",
    "assets-browser.ts",
    "assets-ios.ts",
    "assets-store.ts",
    "palette.ts",
  ]) {
    const source = readFileSync(new URL(`./${name}`, import.meta.url), "utf8");
    assert.equal(source.includes("localStorage.getItem"), false, name);
    assert.equal(source.includes("localStorage.setItem"), false, name);
    assert.equal(source.includes("localStorage.removeItem"), false, name);
    assert.equal(source.includes("fetch("), false, name);
    assert.equal(source.includes("data-theme"), false, name);
  }
  const browser = readFileSync(new URL("./assets-browser.ts", import.meta.url), "utf8");
  assert.equal(browser.includes('imageOrientation: "none"'), true);
  assert.equal(browser.includes("image/jpeg"), true);
  assert.equal(browser.includes("image/webp"), true);
  const persistence = readFileSync(new URL("./persistence.ts", import.meta.url), "utf8");
  assert.equal(persistence.includes("fetch("), false);
  assert.equal(persistence.includes("indexedDB"), false);
  assert.equal(persistence.includes("data-theme"), false);
});
