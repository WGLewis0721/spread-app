/**
 * Byte store for Studio derivatives.
 *
 * Image bytes stay behind this interface (IndexedDB on the web). They are never
 * written to localStorage. Callers pass a store in; tests pass an in-memory fake.
 * Read against contract 432b7c245d9dae3e1eb9a18aac6ba6921f0158c6.
 */

export const STUDIO_OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9-]{0,63}$/;

/** Same shape as contract.ts ids. Not a second appearance schema. */
export function isStudioOpaqueId(value: string): boolean {
  return STUDIO_OPAQUE_ID.test(value);
}

export type AssetRecord = {
  id: string;
  profileId: string;
  format: "jpeg" | "webp";
  width: number;
  height: number;
  bytes: Uint8Array;
};

export type AssetPutResult = "ok" | "full" | "failed";

export type AssetByteStore = {
  put(record: AssetRecord): Promise<AssetPutResult>;
  get(profileId: string, id: string): Promise<AssetRecord | null>;
  delete(profileId: string, id: string): Promise<void>;
  list(): Promise<Array<Pick<AssetRecord, "id" | "profileId">>>;
};

export type AssetDb = {
  put(record: AssetRecord): Promise<void>;
  get(id: string): Promise<AssetRecord | null>;
  delete(id: string): Promise<void>;
  list(): Promise<Array<Pick<AssetRecord, "id" | "profileId">>>;
};

export function isStorageFull(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? String((error as { name?: unknown }).name) : "";
  if (name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED") return true;
  const code = "code" in error ? (error as { code?: unknown }).code : undefined;
  return code === 22;
}

function copyRecord(record: AssetRecord): AssetRecord {
  return { ...record, bytes: new Uint8Array(record.bytes) };
}

/**
 * Profile isolation lives here: a get or delete for the wrong profile does not
 * reveal or remove the other profile's bytes.
 */
export function assetStoreFromDb(db: AssetDb): AssetByteStore {
  return {
    async put(record) {
      try {
        await db.put(copyRecord(record));
        return "ok";
      } catch (error) {
        return isStorageFull(error) ? "full" : "failed";
      }
    },
    async get(profileId, id) {
      try {
        const row = await db.get(id);
        if (!row || row.profileId !== profileId) return null;
        return copyRecord(row);
      } catch {
        return null;
      }
    },
    async delete(profileId, id) {
      try {
        const row = await db.get(id);
        if (!row || row.profileId !== profileId) return;
        await db.delete(id);
      } catch {
        // Leaving an unreadable row is safer than throwing into a cleanup.
      }
    },
    async list() {
      try {
        return await db.list();
      } catch {
        return [];
      }
    },
  };
}

const DB_NAME = "spread-studio-assets";
const DB_VERSION = 1;
const STORE_NAME = "assets";

type AssetRow = {
  id: string;
  profileId: string;
  format: "jpeg" | "webp";
  width: number;
  height: number;
  blob: Blob;
};

function asRow(value: unknown): AssetRow | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<AssetRow>;
  if (typeof row.id !== "string" || typeof row.profileId !== "string") return null;
  if (row.format !== "jpeg" && row.format !== "webp") return null;
  if (typeof row.width !== "number" || typeof row.height !== "number") return null;
  if (
    !Number.isInteger(row.width) ||
    !Number.isInteger(row.height) ||
    row.width < 1 ||
    row.height < 1
  ) {
    return null;
  }
  if (!(row.blob instanceof Blob)) return null;
  return {
    id: row.id,
    profileId: row.profileId,
    format: row.format,
    width: row.width,
    height: row.height,
    blob: row.blob,
  };
}

function openDatabase(idb: Pick<IDBFactory, "open">): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = idb.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("profileId", "profileId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("indexeddb"));
  });
}

function requestOf<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("indexeddb"));
  });
}

/**
 * Web byte store. `idb` is passed in (normally `indexedDB`) so this module does
 * not touch a database at import time. Node tests do not call this.
 */
export function createIndexedDbAssetStore(idb: Pick<IDBFactory, "open">): AssetByteStore {
  let opening: Promise<IDBDatabase> | null = null;
  const database = () => {
    if (!opening) {
      opening = openDatabase(idb).catch((error: unknown) => {
        opening = null;
        throw error;
      });
    }
    return opening;
  };
  const run = async <T>(
    mode: IDBTransactionMode,
    body: (store: IDBObjectStore) => IDBRequest<T>,
  ) => {
    const db = await database();
    const tx = db.transaction(STORE_NAME, mode);
    const request = body(tx.objectStore(STORE_NAME));
    if (import.meta.env?.DEV) {
      console.debug(`[Studio IndexedDB] ${mode} request ${request.source?.constructor.name}`);
      request.addEventListener("success", () => console.debug(`[Studio IndexedDB] ${mode} request-success`));
      request.addEventListener("error", () => console.debug(`[Studio IndexedDB] ${mode} request-error`));
      tx.addEventListener("complete", () => console.debug(`[Studio IndexedDB] ${mode} tx-complete`));
      tx.addEventListener("abort", () => console.debug(`[Studio IndexedDB] ${mode} tx-abort`));
    }
    return requestOf(request);
  };
  return assetStoreFromDb({
    async put(record) {
      const blob = new Blob([Uint8Array.from(record.bytes)], {
        type: record.format === "webp" ? "image/webp" : "image/jpeg",
      });
      const row: AssetRow = {
        id: record.id,
        profileId: record.profileId,
        format: record.format,
        width: record.width,
        height: record.height,
        blob,
      };
      await run("readwrite", (store) => store.put(row));
    },
    async get(id) {
      const row = asRow(await run("readonly", (store) => store.get(id)));
      if (!row) return null;
      return {
        id: row.id,
        profileId: row.profileId,
        format: row.format,
        width: row.width,
        height: row.height,
        bytes: new Uint8Array(await row.blob.arrayBuffer()),
      };
    },
    async delete(id) {
      await run("readwrite", (store) => store.delete(id));
    },
    async list() {
      const rows = await run("readonly", (store) => store.getAll());
      if (!Array.isArray(rows)) return [];
      const listed: Array<Pick<AssetRecord, "id" | "profileId">> = [];
      for (const item of rows) {
        const row = asRow(item);
        if (row) listed.push({ id: row.id, profileId: row.profileId });
      }
      return listed;
    },
  });
}
