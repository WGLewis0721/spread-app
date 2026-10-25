/**
 * iOS file adapter for Studio derivatives.
 *
 * Uses @capacitor/filesystem 8 (already a dependency). Bytes are base64 on the
 * wire because writeFile treats a string as base64 when `encoding` is omitted.
 * Files go in Directory.LibraryNoCloud so they are not part of an iCloud backup.
 * This module does not import the plugin until openIosStudioFiles() runs.
 * Read against contract 432b7c245d9dae3e1eb9a18aac6ba6921f0158c6.
 * Capacitor Filesystem write/read/delete/readdir/mkdir checked 2026-10-25:
 * https://capacitorjs.com/docs/apis/filesystem
 */
import { parseAssetRef } from "./contract.ts";
import {
  isStorageFull,
  isStudioOpaqueId,
  type AssetByteStore,
  type AssetPutResult,
  type AssetRecord,
} from "./assets-store.ts";

const ROOT = "studio-assets";
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function bytesToBase64(bytes: Uint8Array): string {
  let out = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = index + 1 < bytes.length ? (bytes[index + 1] ?? 0) : 0;
    const third = index + 2 < bytes.length ? (bytes[index + 2] ?? 0) : 0;
    const triple = (first << 16) | (second << 8) | third;
    out += ALPHABET[(triple >> 18) & 63];
    out += ALPHABET[(triple >> 12) & 63];
    out += index + 1 < bytes.length ? ALPHABET[(triple >> 6) & 63] : "=";
    out += index + 2 < bytes.length ? ALPHABET[triple & 63] : "=";
  }
  return out;
}

export function base64ToBytes(text: string): Uint8Array | null {
  if (text.length === 0 || text.length % 4 !== 0) return null;
  const cleaned = text.replace(/=+$/, "");
  if (cleaned.length === 0) return new Uint8Array(0);
  const bytes: number[] = [];
  for (let index = 0; index < cleaned.length; index += 4) {
    const chunk = cleaned.slice(index, index + 4);
    const codes = [0, 0, 0, 0];
    for (let part = 0; part < chunk.length; part += 1) {
      const code = ALPHABET.indexOf(chunk[part] ?? "");
      if (code < 0) return null;
      codes[part] = code;
    }
    const triple =
      ((codes[0] ?? 0) << 18) | ((codes[1] ?? 0) << 12) | ((codes[2] ?? 0) << 6) | (codes[3] ?? 0);
    bytes.push((triple >> 16) & 255);
    if (chunk.length > 2) bytes.push((triple >> 8) & 255);
    if (chunk.length > 3) bytes.push(triple & 255);
  }
  return Uint8Array.from(bytes);
}

export type StudioFileBytes = {
  write(path: string, bytes: Uint8Array): Promise<AssetPutResult>;
  read(path: string): Promise<Uint8Array | null>;
  delete(path: string): Promise<void>;
  list(path: string): Promise<Array<{ name: string; type: string }>>;
};

/**
 * Subset of @capacitor/filesystem used here. `encoding` is intentionally absent:
 * binary writes must be base64 with no encoding argument.
 */
export type StudioFilesystem<Name extends string> = {
  writeFile(options: {
    path: string;
    data: string;
    directory?: Name;
    recursive?: boolean;
  }): Promise<{ uri: string }>;
  readFile(options: { path: string; directory?: Name }): Promise<{ data: string | Blob }>;
  deleteFile(options: { path: string; directory?: Name }): Promise<void>;
  mkdir(options: { path: string; directory?: Name; recursive?: boolean }): Promise<void>;
  readdir(options: { path: string; directory?: Name }): Promise<{
    files: Array<{ name: string; type: string }>;
  }>;
};

export function studioAssetPath(
  profileId: string,
  assetId: string,
  ext: "bin" | "json",
): string | null {
  if (!isStudioOpaqueId(profileId) || !isStudioOpaqueId(assetId)) return null;
  const path = `${ROOT}/${profileId}/${assetId}.${ext}`;
  if (path.split("/").includes("..")) return null;
  return path;
}

export function studioAssetFiles<Name extends string>(
  filesystem: StudioFilesystem<Name>,
  directory: Name,
): StudioFileBytes {
  const rejectPath = (path: string) =>
    path.split("/").includes("..") || path.startsWith("/") || path.includes("\\");
  return {
    async write(path, bytes) {
      if (rejectPath(path)) return "failed";
      const slash = path.lastIndexOf("/");
      if (slash > 0) {
        await filesystem
          .mkdir({ path: path.slice(0, slash), directory, recursive: true })
          .catch(() => undefined);
      }
      try {
        await filesystem.writeFile({
          path,
          data: bytesToBase64(bytes),
          directory,
          recursive: true,
        });
        return "ok";
      } catch (error) {
        return isStorageFull(error) ? "full" : "failed";
      }
    },
    async read(path) {
      if (rejectPath(path)) return null;
      try {
        const result = await filesystem.readFile({ path, directory });
        if (typeof result.data !== "string") return null;
        return base64ToBytes(result.data);
      } catch {
        return null;
      }
    },
    async delete(path) {
      if (rejectPath(path)) return;
      await filesystem.deleteFile({ path, directory }).catch(() => undefined);
    },
    async list(path) {
      if (rejectPath(path)) return [];
      try {
        const result = await filesystem.readdir({ path, directory });
        return result.files.map((file) => ({ name: file.name, type: file.type }));
      } catch {
        return [];
      }
    },
  };
}

type Sidecar = {
  id: string;
  profileId: string;
  format: "jpeg" | "webp";
  width: number;
  height: number;
  bytes: number;
  orientation: 1;
};

function sidecarOf(value: unknown, profileId: string, assetId: string): Sidecar | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const allowed = ["id", "format", "width", "height", "bytes", "orientation", "profileId"];
  for (const key of Object.keys(row)) {
    if (!allowed.includes(key)) return null;
  }
  if (row.profileId !== profileId) return null;
  const parsed = parseAssetRef({
    id: row.id,
    format: row.format,
    width: row.width,
    height: row.height,
    bytes: row.bytes,
    orientation: row.orientation,
  });
  if (!parsed.ok || parsed.value.orientation !== 1 || parsed.value.id !== assetId) return null;
  if (parsed.value.format !== "jpeg" && parsed.value.format !== "webp") return null;
  return {
    id: parsed.value.id,
    profileId,
    format: parsed.value.format,
    width: parsed.value.width,
    height: parsed.value.height,
    bytes: parsed.value.bytes,
    orientation: 1,
  };
}

/** File-backed AssetByteStore. Metadata is a small JSON sidecar; pixels are the .bin file. */
export function createFileAssetStore(files: StudioFileBytes): AssetByteStore {
  const store: AssetByteStore = {
    async put(record): Promise<AssetPutResult> {
      const bin = studioAssetPath(record.profileId, record.id, "bin");
      const json = studioAssetPath(record.profileId, record.id, "json");
      if (!bin || !json || (record.format !== "jpeg" && record.format !== "webp")) return "failed";
      const sidecar: Sidecar = {
        id: record.id,
        profileId: record.profileId,
        format: record.format,
        width: record.width,
        height: record.height,
        bytes: record.bytes.byteLength,
        orientation: 1,
      };
      const written = await files.write(bin, record.bytes);
      if (written !== "ok") {
        await files.delete(bin);
        return written;
      }
      const meta = await files.write(json, new TextEncoder().encode(JSON.stringify(sidecar)));
      if (meta !== "ok") {
        await files.delete(bin);
        return meta;
      }
      return "ok";
    },
    async get(profileId, id): Promise<AssetRecord | null> {
      const jsonPath = studioAssetPath(profileId, id, "json");
      const binPath = studioAssetPath(profileId, id, "bin");
      if (!jsonPath || !binPath) return null;
      const metaBytes = await files.read(jsonPath);
      const bin = await files.read(binPath);
      if (!metaBytes || !bin) return null;
      let parsed: unknown;
      try {
        parsed = JSON.parse(new TextDecoder().decode(metaBytes));
      } catch {
        return null;
      }
      const sidecar = sidecarOf(parsed, profileId, id);
      if (!sidecar || sidecar.bytes !== bin.byteLength) return null;
      return {
        id,
        profileId,
        format: sidecar.format,
        width: sidecar.width,
        height: sidecar.height,
        bytes: bin,
      };
    },
    async delete(profileId, id) {
      const bin = studioAssetPath(profileId, id, "bin");
      const json = studioAssetPath(profileId, id, "json");
      if (bin) await files.delete(bin);
      if (json) await files.delete(json);
    },
    async list() {
      const root = await files.list(ROOT);
      const rows: Array<Pick<AssetRecord, "id" | "profileId">> = [];
      for (const entry of root) {
        if (entry.type !== "directory" || !isStudioOpaqueId(entry.name)) continue;
        const names = await files.list(`${ROOT}/${entry.name}`);
        for (const file of names) {
          if (!file.name.endsWith(".json")) continue;
          const id = file.name.slice(0, -".json".length);
          const record = await store.get(entry.name, id);
          if (record) rows.push({ id: record.id, profileId: record.profileId });
        }
      }
      return rows;
    },
  };
  return store;
}

/**
 * Opens the native file store. Not called from tests or from the web build path.
 * Directory.LibraryNoCloud is the iOS Library location that is excluded from backup.
 */
export async function openIosStudioFiles(): Promise<StudioFileBytes> {
  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  return studioAssetFiles(Filesystem, Directory.LibraryNoCloud);
}
