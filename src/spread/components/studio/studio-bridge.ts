/**
 * Load, import, and apply. Only Apply calls the appearance writer.
 * Image bytes stay in the byte store passed in.
 */

import {
  importStudioImage,
  type RasterDecoder,
  type RasterEncoder,
} from "../../../lib/spread/studio/assets.ts";
import { browserRasterTools } from "../../../lib/spread/studio/assets-browser.ts";
import {
  createIndexedDbAssetStore,
  type AssetByteStore,
} from "../../../lib/spread/studio/assets-store.ts";
import { createFileAssetStore, openIosStudioFiles } from "../../../lib/spread/studio/assets-ios.ts";
import {
  commitStudioAppearance,
  loadStudioAppearance,
  studioStorageFrom,
  sweepOrphanStudioData,
  sweepUnreferencedStudioAssets,
  type StudioStorage,
} from "../../../lib/spread/studio/persistence.ts";
import { isNativeApp } from "../../../lib/spread/native.ts";
import { parseProfiles, PROFILES_KEY } from "../../../lib/spread/profiles.ts";
import { importFailureCopy, STUDIO_UI_COPY } from "./studio-copy.ts";
import {
  openStudioSession,
  plannerUnchanged,
  reduceStudioSession,
  type StudioEffect,
  type StudioSession,
} from "./draft.ts";

export function browserStudioStorage(): StudioStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return studioStorageFrom(window.localStorage);
  } catch {
    return null;
  }
}

let storePromise: Promise<AssetByteStore | null> | null = null;

export function studioAssetStore(): Promise<AssetByteStore | null> {
  if (!storePromise) {
    storePromise = openAssetStore().catch(() => {
      storePromise = null;
      return null;
    });
  }
  return storePromise;
}

async function openAssetStore(): Promise<AssetByteStore | null> {
  const assets = isNativeApp()
    ? createFileAssetStore(await openIosStudioFiles())
    : typeof indexedDB !== "undefined"
      ? await createIndexedDbAssetStore(indexedDB)
      : null;
  if (!assets) return null;

  // One cold-start sweep, BEFORE handing the store to any editor/import caller.
  // Only trust an actual readable roster; a storage failure must never erase photos.
  const storage = browserStudioStorage();
  if (storage) {
    try {
      const raw = storage.getItem(PROFILES_KEY);
      const profiles = parseProfiles(raw);
      if (raw !== null && profiles.length > 0) {
        const ids = profiles.map((profile) => profile.id);
        await sweepOrphanStudioData(storage, assets, ids);
        await sweepUnreferencedStudioAssets(storage, assets, ids);
      }
    } catch {
      // Studio still opens if maintenance is unavailable; retry next launch.
    }
  }
  return assets;
}

export async function loadSession(input: {
  storage: StudioStorage | null;
  assets: Pick<AssetByteStore, "get"> | null;
  profileId: string | null;
  enabled: boolean;
  planner: string;
}): Promise<StudioSession> {
  const loaded = await loadStudioAppearance(input.storage, input.assets, input.profileId, {
    enabled: input.enabled,
  });
  return openStudioSession({
    render: loaded.appearance,
    imageMessage: loaded.message,
    planner: input.planner,
  });
}

export async function commitDraft(input: {
  storage: StudioStorage | null;
  assets: AssetByteStore | null;
  profileId: string | null;
  session: StudioSession;
  enabled: boolean;
  planner: string;
}): Promise<{ session: StudioSession; wrote: boolean }> {
  if (!input.enabled || !plannerUnchanged(input.session, input.planner)) {
    return {
      session: reduceStudioSession(input.session, {
        type: "note",
        message: input.enabled ? STUDIO_UI_COPY.planChanged : null,
      }).state,
      wrote: false,
    };
  }
  const prepared = reduceStudioSession(input.session, { type: "apply" });
  if (prepared.effect.type !== "commit") return { session: prepared.state, wrote: false };
  const result = await commitStudioAppearance(
    input.storage,
    input.assets,
    input.profileId,
    prepared.effect.appearance,
    { enabled: input.enabled, pendingAssetId: prepared.effect.pendingAssetId },
  );
  if (!result.ok) {
    return {
      session: reduceStudioSession(prepared.state, { type: "commit-failed", message: result.message }).state,
      wrote: false,
    };
  }
  return {
    session: reduceStudioSession(prepared.state, { type: "commit-succeeded" }).state,
    wrote: true,
  };
}

export async function importDraftPhoto(input: {
  session: StudioSession;
  profileId: string;
  bytes: Uint8Array;
  mime?: string;
  store: AssetByteStore;
  enabled: boolean;
  signal?: AbortSignal;
  decoder?: RasterDecoder;
  encoder?: RasterEncoder;
}): Promise<{ session: StudioSession; effect: StudioEffect; message: string | null }> {
  const tools = input.decoder && input.encoder ? { decoder: input.decoder, encoder: input.encoder } : browserRasterTools();
  const result = await importStudioImage({
    profileId: input.profileId,
    bytes: input.bytes,
    mime: input.mime,
    signal: input.signal,
    decoder: tools.decoder,
    encoder: tools.encoder,
    store: input.store,
    enabled: input.enabled,
  });
  if (!result.ok) {
    const message = importFailureCopy(result.reason, result.message);
    return {
      session: reduceStudioSession(input.session, { type: "note", message }).state,
      effect: { type: "none" },
      message,
    };
  }
  const next = reduceStudioSession(input.session, {
    type: "imported",
    assetId: result.ref.id,
    suggestion: result.suggestion.palette,
  });
  return { session: next.state, effect: next.effect, message: null };
}

export async function dropPendingAsset(
  assets: AssetByteStore | null,
  profileId: string | null,
  assetId: string,
): Promise<void> {
  if (!assets || !profileId) return;
  await assets.delete(profileId, assetId);
}
