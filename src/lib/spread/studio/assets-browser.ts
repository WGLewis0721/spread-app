/**
 * Browser decode and encode. Thin on purpose: the resize and orientation math
 * live in assets.ts. createImageBitmap is called with imageOrientation "none"
 * so EXIF is applied once, by applyOrientation, not by the decoder.
 * Checked 2026-10-25: https://developer.mozilla.org/en-US/docs/Web/API/createImageBitmap
 * Node tests do not call these. There is no canvas in the test runner.
 */
import type { DecodedRaster, RasterDecoder, RasterEncoder } from "./assets.ts";

export async function bytesFromBlob(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

export async function decodeRasterWithBrowser(
  bytes: Uint8Array,
  signal: AbortSignal,
): Promise<DecodedRaster | null> {
  if (signal.aborted || typeof createImageBitmap !== "function") return null;
  try {
    const blob = new Blob([Uint8Array.from(bytes)]);
    const bitmap = await createImageBitmap(blob, { imageOrientation: "none" });
    try {
      if (signal.aborted || typeof document === "undefined") return null;
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return null;
      context.drawImage(bitmap, 0, 0);
      const data = context.getImageData(0, 0, bitmap.width, bitmap.height);
      return { width: bitmap.width, height: bitmap.height, rgba: data.data };
    } finally {
      bitmap.close();
    }
  } catch {
    return null;
  }
}

async function encodedBlob(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  format: "jpeg" | "webp",
): Promise<Blob | null> {
  const type = format === "webp" ? "image/webp" : "image/jpeg";
  const pixels = new ImageData(new Uint8ClampedArray(rgba), width, height);
  if (typeof OffscreenCanvas === "function") {
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.putImageData(pixels, 0, 0);
    return canvas.convertToBlob({ type, quality: 0.85 });
  }
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.putImageData(pixels, 0, 0);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, 0.85);
  });
}

export async function encodeRasterWithBrowser(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  format: "jpeg" | "webp",
): Promise<Uint8Array | null> {
  try {
    const blob = await encodedBlob(rgba, width, height, format);
    if (!blob) return null;
    return bytesFromBlob(blob);
  } catch {
    return null;
  }
}

export function browserRasterTools(): { decoder: RasterDecoder; encoder: RasterEncoder } {
  return {
    decoder: { decode: (bytes, signal) => decodeRasterWithBrowser(bytes, signal) },
    encoder: {
      encode: (rgba, width, height, format) => encodeRasterWithBrowser(rgba, width, height, format),
    },
  };
}
