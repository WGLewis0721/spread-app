/**
 * Per-profile StudioAppearanceV1 persistence.
 *
 * Keys are `spread-studio.<profileId>`, following view-context.ts: outside the
 * `spread.*` namespace that backup.ts and the native mirror copy. Image bytes
 * are not stored here. A missing photo after restore is a data-level status;
 * the look to render is the original appearance. Studio off does not read or
 * write, and it does not delete anything.
 * Read against contract 432b7c245d9dae3e1eb9a18aac6ba6921f0158c6.
 */
import {
  originalStudioAppearance,
  parseStudioAppearance,
  STUDIO_FLAG,
  type StudioAppearanceV1,
} from "./contract.ts";
import { isStorageFull, isStudioOpaqueId, type AssetByteStore } from "./assets-store.ts";

export const STUDIO_APPEARANCE_KEY_PREFIX = "spread-studio.";

/**
 * Appearance JSON may be copied into a backup. Image bytes may not.
 * After restore the photo is absent, so the rendered look is the original.
 */
export const STUDIO_BACKUP_POLICY = {
  appearanceJson: "include",
  imageBytes: "exclude",
  missingImage: "original-look",
  keyPrefix: STUDIO_APPEARANCE_KEY_PREFIX,
} as const;

export const STUDIO_PERSISTENCE_MESSAGES = {
  missingImage:
    "The wallpaper for this profile isn't on this device. Spread is showing the original look.",
  invalid: "This profile's appearance could not be read. Spread is showing the original look.",
  saveFailed: "The appearance could not be saved. Your planner was not changed.",
  storageFull: "There isn't enough room to keep this appearance. Nothing was saved.",
  disabled: "Customize is turned off.",
  missingProfile: "There is no profile to attach this appearance to.",
  invalidAppearance: "This appearance could not be saved. Your planner was not changed.",
  backupOmittedImage:
    "The appearance is in the backup. The photo is not. Restoring shows the original look until that photo is imported again.",
} as const;

export type StudioStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  keys?: () => readonly string[];
};

export type StudioAppearanceLoad = {
  state: "original" | "saved" | "missing-image" | "invalid";
  /** Look to render. Original when the photo is missing, the JSON is unreadable, or Studio is off. */
  appearance: StudioAppearanceV1;
  /** Parsed saved value. Null when nothing is saved or the JSON did not parse. Not the render look. */
  stored: StudioAppearanceV1 | null;
  message: string | null;
  assetId: string | null;
};

export type StudioSaveReason =
  "disabled" | "missing-profile" | "invalid" | "missing-image" | "save-failed" | "storage-full";

export type StudioSaveResult =
  { ok: true } | { ok: false; reason: StudioSaveReason; message: string };

export function studioAppearanceKey(profileId: string): string | null {
  if (!isStudioOpaqueId(profileId)) return null;
  return `${STUDIO_APPEARANCE_KEY_PREFIX}${profileId}`;
}

export function profileIdFromStudioKey(key: string): string | null {
  if (!key.startsWith(STUDIO_APPEARANCE_KEY_PREFIX)) return null;
  const profileId = key.slice(STUDIO_APPEARANCE_KEY_PREFIX.length);
  return isStudioOpaqueId(profileId) ? profileId : null;
}

function enabledOf(enabled: boolean | undefined): boolean {
  return enabled ?? STUDIO_FLAG;
}

function originalLoad(): StudioAppearanceLoad {
  return {
    state: "original",
    appearance: originalStudioAppearance(),
    stored: null,
    message: null,
    assetId: null,
  };
}

function readRaw(storage: StudioStorage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function parseStored(raw: string | null): { ok: true; value: StudioAppearanceV1 } | { ok: false } {
  if (raw === null) return { ok: false };
  try {
    const parsed = parseStudioAppearance(JSON.parse(raw) as unknown);
    return parsed.ok ? { ok: true, value: parsed.value } : { ok: false };
  } catch {
    return { ok: false };
  }
}

export function studioStorageFrom(
  storage: {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
    readonly length: number;
    key(index: number): string | null;
  } | null,
): StudioStorage | null {
  if (!storage) return null;
  return {
    getItem: (key) => {
      try {
        return storage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: (key, value) => storage.setItem(key, value),
    removeItem: (key) => storage.removeItem(key),
    keys: () => {
      const keys: string[] = [];
      try {
        for (let index = 0; index < storage.length; index += 1) {
          const key = storage.key(index);
          if (key) keys.push(key);
        }
      } catch {
        return [];
      }
      return keys;
    },
  };
}

async function assetPresent(
  assets: Pick<AssetByteStore, "get"> | null,
  profileId: string,
  assetId: string,
): Promise<boolean> {
  if (!assets) return false;
  try {
    return (await assets.get(profileId, assetId)) !== null;
  } catch {
    return false;
  }
}

export async function loadStudioAppearance(
  storage: StudioStorage | null,
  assets: Pick<AssetByteStore, "get"> | null,
  profileId: string | null,
  options?: { enabled?: boolean },
): Promise<StudioAppearanceLoad> {
  if (!enabledOf(options?.enabled)) return originalLoad();
  if (!storage || !profileId) return originalLoad();
  const key = studioAppearanceKey(profileId);
  if (!key) return originalLoad();
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return originalLoad();
  }
  if (raw === null) return originalLoad();
  const parsed = parseStored(raw);
  if (!parsed.ok) {
    return {
      state: "invalid",
      appearance: originalStudioAppearance(),
      stored: null,
      message: STUDIO_PERSISTENCE_MESSAGES.invalid,
      assetId: null,
    };
  }
  const assetId = parsed.value.wallpaperAssetId ?? null;
  if (!assetId) {
    return {
      state: "saved",
      appearance: parsed.value,
      stored: parsed.value,
      message: null,
      assetId: null,
    };
  }
  if (await assetPresent(assets, profileId, assetId)) {
    return {
      state: "saved",
      appearance: parsed.value,
      stored: parsed.value,
      message: null,
      assetId,
    };
  }
  return {
    state: "missing-image",
    appearance: originalStudioAppearance(),
    stored: parsed.value,
    message: STUDIO_PERSISTENCE_MESSAGES.missingImage,
    assetId,
  };
}

async function dropAsset(
  assets: AssetByteStore | null,
  profileId: string,
  assetId: string | null | undefined,
) {
  if (!assets || !assetId) return;
  try {
    await assets.delete(profileId, assetId);
  } catch {
    // The appearance result stands. sweepOrphanStudioData can remove the leftover.
  }
}

/**
 * Writes appearance JSON only. `pendingAssetId` is removed when the save does not
 * keep it, including a failed save. Flag off writes nothing and deletes nothing.
 */
export async function commitStudioAppearance(
  storage: StudioStorage | null,
  assets: AssetByteStore | null,
  profileId: string | null,
  appearance: unknown,
  options?: { enabled?: boolean; pendingAssetId?: string | null },
): Promise<StudioSaveResult> {
  const pending = options?.pendingAssetId ?? null;
  if (!enabledOf(options?.enabled)) {
    return { ok: false, reason: "disabled", message: STUDIO_PERSISTENCE_MESSAGES.disabled };
  }
  const parsed = parseStudioAppearance(appearance);
  if (!parsed.ok) {
    if (profileId) await dropAsset(assets, profileId, pending);
    return { ok: false, reason: "invalid", message: STUDIO_PERSISTENCE_MESSAGES.invalidAppearance };
  }
  const key = profileId ? studioAppearanceKey(profileId) : null;
  if (!storage || !profileId || !key) {
    if (profileId) await dropAsset(assets, profileId, pending);
    return {
      ok: false,
      reason: "missing-profile",
      message: STUDIO_PERSISTENCE_MESSAGES.missingProfile,
    };
  }
  const wallpaperId = parsed.value.wallpaperAssetId ?? null;
  if (wallpaperId && !(await assetPresent(assets, profileId, wallpaperId))) {
    await dropAsset(assets, profileId, pending);
    return {
      ok: false,
      reason: "missing-image",
      message: STUDIO_PERSISTENCE_MESSAGES.missingImage,
    };
  }
  const previous = parseStored(readRaw(storage, key));
  const json = JSON.stringify(parsed.value);
  try {
    storage.setItem(key, json);
  } catch (error) {
    await dropAsset(assets, profileId, pending);
    if (isStorageFull(error)) {
      return {
        ok: false,
        reason: "storage-full",
        message: STUDIO_PERSISTENCE_MESSAGES.storageFull,
      };
    }
    return { ok: false, reason: "save-failed", message: STUDIO_PERSISTENCE_MESSAGES.saveFailed };
  }
  const previousId = previous.ok ? (previous.value.wallpaperAssetId ?? null) : null;
  if (previousId && previousId !== wallpaperId) await dropAsset(assets, profileId, previousId);
  if (pending && pending !== wallpaperId) await dropAsset(assets, profileId, pending);
  return { ok: true };
}

export async function cleanupProfileStudioData(
  storage: StudioStorage | null,
  assets: AssetByteStore | null,
  profileId: string,
): Promise<{ removedAppearance: boolean; removedAssets: number }> {
  let removedAppearance = false;
  const key = studioAppearanceKey(profileId);
  if (storage && key) {
    const had = readRaw(storage, key) !== null;
    try {
      storage.removeItem(key);
      removedAppearance = had;
    } catch {
      removedAppearance = false;
    }
  }
  let removedAssets = 0;
  if (assets && isStudioOpaqueId(profileId)) {
    for (const row of await assets.list()) {
      if (row.profileId !== profileId) continue;
      await assets.delete(profileId, row.id);
      removedAssets += 1;
    }
  }
  return { removedAppearance, removedAssets };
}

export async function sweepOrphanStudioData(
  storage: StudioStorage | null,
  assets: AssetByteStore | null,
  profileIds: readonly string[],
): Promise<{ removedProfiles: string[]; removedAssets: number }> {
  const keep = new Set(profileIds.filter((id) => isStudioOpaqueId(id)));
  const removedProfiles: string[] = [];
  if (storage?.keys) {
    for (const key of storage.keys()) {
      if (!key.startsWith(STUDIO_APPEARANCE_KEY_PREFIX)) continue;
      const profileId = key.slice(STUDIO_APPEARANCE_KEY_PREFIX.length);
      if (keep.has(profileId)) continue;
      try {
        storage.removeItem(key);
        removedProfiles.push(profileId);
      } catch {
        // A later sweep can retry. Do not throw out of profile deletion.
      }
    }
  }
  let removedAssets = 0;
  if (assets) {
    for (const row of await assets.list()) {
      if (keep.has(row.profileId)) continue;
      await assets.delete(row.profileId, row.id);
      removedAssets += 1;
    }
  }
  return { removedProfiles, removedAssets };
}

export type StudioBackupEntry = {
  profileId: string;
  json: string;
  wallpaperAssetId: string | null;
};

/** Appearance JSON only. Byte stores are not read. */
export function collectStudioBackupEntries(storage: StudioStorage | null): StudioBackupEntry[] {
  if (!storage?.keys) return [];
  const entries: StudioBackupEntry[] = [];
  for (const key of storage.keys()) {
    const profileId = profileIdFromStudioKey(key);
    if (!profileId) continue;
    const raw = readRaw(storage, key);
    const parsed = parseStored(raw);
    if (!parsed.ok || raw === null) continue;
    entries.push({
      profileId,
      json: JSON.stringify(parsed.value),
      wallpaperAssetId: parsed.value.wallpaperAssetId ?? null,
    });
  }
  return entries;
}

export function describeStudioBackupEntry(entry: Pick<StudioBackupEntry, "wallpaperAssetId">): {
  appearanceJson: "included";
  imageBytes: "omitted";
  message: string | null;
} {
  return {
    appearanceJson: "included",
    imageBytes: "omitted",
    message: entry.wallpaperAssetId ? STUDIO_PERSISTENCE_MESSAGES.backupOmittedImage : null,
  };
}

/**
 * Pure plan: map backed-up appearance JSON onto the new profile ids a restore
 * assigns. Image bytes are not an input and are not an output. Invalid JSON is skipped.
 */
export function planStudioAppearanceRestore(
  entries: readonly { profileId: string; json: string }[],
  idMap: Readonly<Record<string, string>>,
): { writes: { key: string; value: string }[]; skipped: string[] } {
  const writes: { key: string; value: string }[] = [];
  const skipped: string[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const target = idMap[entry.profileId];
    const key = target ? studioAppearanceKey(target) : null;
    if (!key || seen.has(key)) {
      skipped.push(entry.profileId);
      continue;
    }
    const parsed = parseStored(entry.json);
    if (!parsed.ok) {
      skipped.push(entry.profileId);
      continue;
    }
    seen.add(key);
    writes.push({ key, value: JSON.stringify(parsed.value) });
  }
  return { writes, skipped };
}

export type StudioImageStatus = {
  image: "none" | "present" | "absent";
  assetId: string | null;
  message: string | null;
};

export async function studioImageStatus(
  appearance: StudioAppearanceV1,
  profileId: string,
  assets: Pick<AssetByteStore, "get"> | null,
): Promise<StudioImageStatus> {
  const assetId = appearance.wallpaperAssetId ?? null;
  if (!assetId) return { image: "none", assetId: null, message: null };
  if (await assetPresent(assets, profileId, assetId))
    return { image: "present", assetId, message: null };
  return { image: "absent", assetId, message: STUDIO_PERSISTENCE_MESSAGES.missingImage };
}
