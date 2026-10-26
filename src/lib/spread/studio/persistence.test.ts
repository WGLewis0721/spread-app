import assert from "node:assert/strict";
import test from "node:test";
import { isMirrorKey, isPlannerKey } from "../native-mirror.ts";
import {
  originalStudioAppearance,
  parseStudioAppearance,
  type StudioAppearanceV1,
} from "./contract.ts";
import {
  STUDIO_ASSET_MESSAGES,
  importStudioImage,
  type RasterDecoder,
  type RasterEncoder,
} from "./assets.ts";
import { type AssetByteStore, type AssetRecord } from "./assets-store.ts";
import {
  STUDIO_APPEARANCE_KEY_PREFIX,
  STUDIO_BACKUP_POLICY,
  STUDIO_PERSISTENCE_MESSAGES,
  cleanupProfileStudioData,
  collectStudioBackupEntries,
  commitStudioAppearance,
  describeStudioBackupEntry,
  loadStudioAppearance,
  planStudioAppearanceRestore,
  profileIdFromStudioKey,
  studioAppearanceKey,
  studioImageStatus,
  sweepOrphanStudioData,
  sweepUnreferencedStudioAssets,
  type StudioStorage,
} from "./persistence.ts";

const SECRET = "EXIF-SECRET-MARKER";

function appearance(patch: Partial<StudioAppearanceV1> = {}): StudioAppearanceV1 {
  return { ...originalStudioAppearance(), ...patch };
}

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  let mode: "ok" | "fail" | "quota" = "ok";
  const storage: StudioStorage = {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      if (mode === "quota") throw new DOMException("quota", "QuotaExceededError");
      if (mode === "fail") throw new Error("denied");
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
    keys: () => [...map.keys()],
  };
  return {
    storage,
    map,
    setMode(next: "ok" | "fail" | "quota") {
      mode = next;
    },
  };
}

function memoryAssets() {
  const rows = new Map<string, AssetRecord>();
  const key = (profileId: string, id: string) => `${profileId}\n${id}`;
  const store: AssetByteStore = {
    async put(record) {
      rows.set(key(record.profileId, record.id), {
        ...record,
        bytes: new Uint8Array(record.bytes),
      });
      return "ok";
    },
    async get(profileId, id) {
      const row = rows.get(key(profileId, id));
      return row ? { ...row, bytes: new Uint8Array(row.bytes) } : null;
    },
    async delete(profileId, id) {
      rows.delete(key(profileId, id));
    },
    async list() {
      return [...rows.values()].map((row) => ({ id: row.id, profileId: row.profileId }));
    },
  };
  return { store, rows };
}

function jpeg(): Uint8Array {
  const secret = new TextEncoder().encode(SECRET);
  return concat(
    new Uint8Array([0xff, 0xd8, 0xff, 0xfe, 0x00, secret.length + 2]),
    secret,
    sof(),
    new Uint8Array([0xff, 0xd9]),
  );
}

function sof(): Uint8Array {
  return new Uint8Array([
    0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x02, 0x00, 0x02, 0x01, 0x01, 0x11, 0x00,
  ]);
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

const rgba = new Uint8ClampedArray(2 * 2 * 4).fill(255);
rgba[0] = 180;
rgba[1] = 0;
rgba[2] = 0;

const decoder: RasterDecoder = {
  async decode() {
    return { width: 2, height: 2, rgba };
  },
};
const encoder: RasterEncoder = {
  async encode() {
    return Uint8Array.from([9, 8, 7, 6]);
  },
};

function plannerSeed(): Record<string, string> {
  return {
    "spread.v1": JSON.stringify({
      hats: [{ id: "work", name: "Work" }],
      weeks: {},
      currentWeek: "2026-10-19",
    }),
    "spread.profiles": JSON.stringify([{ id: "alpha01", name: "Me", store: "spread.v1" }]),
    "spread.profile": "alpha01",
    "spread-view.alpha01": JSON.stringify({ view: "week", plane: "week" }),
  };
}

test("persistence: the key is per profile and outside the planner namespace", () => {
  const alpha = studioAppearanceKey("alpha01");
  const beta = studioAppearanceKey("beta02");
  assert.equal(alpha, "spread-studio.alpha01");
  assert.equal(beta, "spread-studio.beta02");
  assert.notEqual(alpha, beta);
  assert.equal(alpha?.startsWith("spread."), false);
  assert.equal(STUDIO_APPEARANCE_KEY_PREFIX, "spread-studio.");
  assert.equal(STUDIO_BACKUP_POLICY.appearanceJson, "include");
  assert.equal(STUDIO_BACKUP_POLICY.imageBytes, "exclude");
  assert.equal(STUDIO_BACKUP_POLICY.missingImage, "original-look");
  assert.equal(isMirrorKey(alpha ?? ""), false);
  assert.equal(isPlannerKey(alpha ?? ""), false);
  assert.equal(profileIdFromStudioKey("spread-studio.alpha01"), "alpha01");
  assert.equal(profileIdFromStudioKey("spread.v1.alpha01"), null);
  assert.equal(studioAppearanceKey("../nope"), null);
  assert.equal(studioAppearanceKey(""), null);
});

test("persistence: a profile keeps its appearance across a relaunch, and another profile does not see it", async () => {
  const saved = memoryStorage(plannerSeed());
  const assets = memoryAssets();
  const imported = await importStudioImage({
    profileId: "alpha01",
    bytes: jpeg(),
    decoder,
    encoder,
    store: assets.store,
    enabled: true,
    createId: () => "photo-a",
  });
  assert.equal(imported.ok, true);
  if (!imported.ok) return;
  const look = appearance({
    id: "look-a",
    name: "Mine",
    mode: "dark",
    wallpaperAssetId: imported.ref.id,
    palette: imported.suggestion.palette,
  });
  assert.equal(parseStudioAppearance(look).ok, true);
  assert.equal(
    (
      await commitStudioAppearance(saved.storage, assets.store, "alpha01", look, {
        enabled: true,
        pendingAssetId: "photo-a",
      })
    ).ok,
    true,
  );
  const other = appearance({ id: "look-b", name: "Other", mode: "light" });
  assert.equal(
    (await commitStudioAppearance(saved.storage, assets.store, "beta02", other, { enabled: true }))
      .ok,
    true,
  );

  const relaunch = memoryStorage(Object.fromEntries(saved.map));
  const alpha = await loadStudioAppearance(relaunch.storage, assets.store, "alpha01", {
    enabled: true,
  });
  const beta = await loadStudioAppearance(relaunch.storage, assets.store, "beta02", {
    enabled: true,
  });
  assert.equal(alpha.state, "saved");
  assert.equal(alpha.appearance.wallpaperAssetId, "photo-a");
  assert.equal(alpha.appearance.mode, "dark");
  assert.equal(beta.state, "saved");
  assert.equal(beta.appearance.wallpaperAssetId, undefined);
  assert.notEqual(alpha.appearance.name, beta.appearance.name);
  assert.equal(await assets.store.get("beta02", "photo-a"), null);
  assert.ok(await assets.store.get("alpha01", "photo-a"));
  for (const [key, value] of relaunch.map) {
    assert.equal(value.includes(SECRET), false, key);
    assert.equal(value.includes("data:image"), false, key);
    if (key.startsWith(STUDIO_APPEARANCE_KEY_PREFIX)) assert.ok(value.length < 4000, key);
  }
  for (const key of Object.keys(plannerSeed()))
    assert.equal(relaunch.map.get(key), plannerSeed()[key], key);
});

test("persistence: save failure, a full disk, and a bad value leave the previous appearance", async () => {
  const saved = memoryStorage(plannerSeed());
  const assets = memoryAssets();
  const first = appearance({ id: "look-a", name: "First" });
  assert.equal(
    (await commitStudioAppearance(saved.storage, assets.store, "alpha01", first, { enabled: true }))
      .ok,
    true,
  );
  await assets.store.put({
    id: "photo-b",
    profileId: "alpha01",
    format: "jpeg",
    width: 2,
    height: 2,
    bytes: new TextEncoder().encode(SECRET),
  });
  const next = appearance({ id: "look-b", name: "Second", wallpaperAssetId: "photo-b" });
  saved.setMode("fail");
  const failed = await commitStudioAppearance(saved.storage, assets.store, "alpha01", next, {
    enabled: true,
    pendingAssetId: "photo-b",
  });
  assert.equal(failed.ok, false);
  if (!failed.ok) {
    assert.equal(failed.reason, "save-failed");
    assert.equal(failed.message, STUDIO_PERSISTENCE_MESSAGES.saveFailed);
  }
  saved.setMode("ok");
  const loaded = await loadStudioAppearance(saved.storage, assets.store, "alpha01", {
    enabled: true,
  });
  assert.equal(loaded.appearance.name, "First");
  assert.equal(await assets.store.get("alpha01", "photo-b"), null);
  await assets.store.put({
    id: "photo-c",
    profileId: "alpha01",
    format: "jpeg",
    width: 2,
    height: 2,
    bytes: Uint8Array.from([1]),
  });
  saved.setMode("quota");
  const full = await commitStudioAppearance(
    saved.storage,
    assets.store,
    "alpha01",
    appearance({ id: "look-c", name: "Third", wallpaperAssetId: "photo-c" }),
    { enabled: true, pendingAssetId: "photo-c" },
  );
  assert.equal(full.ok, false);
  if (!full.ok) assert.equal(full.reason, "storage-full");
  assert.equal(
    (await loadStudioAppearance(saved.storage, assets.store, "alpha01", { enabled: true }))
      .appearance.name,
    "First",
  );
  const invalid = await commitStudioAppearance(
    saved.storage,
    assets.store,
    "alpha01",
    { version: 2 },
    { enabled: true },
  );
  assert.equal(invalid.ok, false);
  if (!invalid.ok) assert.equal(invalid.reason, "invalid");
  assert.equal(saved.map.get("spread.v1"), plannerSeed()["spread.v1"]);
});

test("persistence: a missing photo reports an error and the original look, and the JSON stays", async () => {
  const saved = memoryStorage();
  const assets = memoryAssets();
  await assets.store.put({
    id: "photo-a",
    profileId: "alpha01",
    format: "jpeg",
    width: 2,
    height: 2,
    bytes: Uint8Array.from([4, 5, 6]),
  });
  const look = appearance({
    id: "look-a",
    name: "Mine",
    wallpaperAssetId: "photo-a",
    mode: "dark",
  });
  assert.equal(
    (await commitStudioAppearance(saved.storage, assets.store, "alpha01", look, { enabled: true }))
      .ok,
    true,
  );
  await assets.store.delete("alpha01", "photo-a");
  const loaded = await loadStudioAppearance(saved.storage, assets.store, "alpha01", {
    enabled: true,
  });
  assert.equal(loaded.state, "missing-image");
  assert.equal(loaded.message, STUDIO_PERSISTENCE_MESSAGES.missingImage);
  assert.deepEqual(loaded.appearance, originalStudioAppearance());
  assert.equal(loaded.stored?.name, "Mine");
  assert.equal(loaded.assetId, "photo-a");
  assert.equal(saved.map.has("spread-studio.alpha01"), true);
  const again = await loadStudioAppearance(saved.storage, null, "alpha01", { enabled: true });
  assert.equal(again.state, "missing-image");
  const status = await studioImageStatus(look, "alpha01", assets.store);
  assert.equal(status.image, "absent");
  assert.equal(status.message, STUDIO_PERSISTENCE_MESSAGES.missingImage);
});

test("persistence: unreadable JSON uses the original look and does not throw", async () => {
  const saved = memoryStorage({
    "spread-studio.alpha01": "{",
    "spread.v1": plannerSeed()["spread.v1"],
  });
  const loaded = await loadStudioAppearance(saved.storage, null, "alpha01", { enabled: true });
  assert.equal(loaded.state, "invalid");
  assert.equal(loaded.message, STUDIO_PERSISTENCE_MESSAGES.invalid);
  assert.deepEqual(loaded.appearance, originalStudioAppearance());
  assert.equal(loaded.stored, null);
  assert.equal(saved.map.get("spread.v1"), plannerSeed()["spread.v1"]);
  const throwing: StudioStorage = {
    getItem() {
      throw new Error("denied");
    },
    setItem() {
      throw new Error("denied");
    },
    removeItem() {
      throw new Error("denied");
    },
  };
  assert.equal(
    (await loadStudioAppearance(throwing, null, "alpha01", { enabled: true })).state,
    "original",
  );
  assert.equal(
    (await loadStudioAppearance(null, null, "alpha01", { enabled: true })).state,
    "original",
  );
  assert.equal(
    (await loadStudioAppearance(saved.storage, null, null, { enabled: true })).state,
    "original",
  );
});

test("persistence: flag off reads the original look and writes nothing", async () => {
  const saved = memoryStorage({
    "spread-studio.alpha01": JSON.stringify(appearance({ id: "look-a", name: "Mine" })),
  });
  const assets = memoryAssets();
  await assets.store.put({
    id: "photo-a",
    profileId: "alpha01",
    format: "jpeg",
    width: 1,
    height: 1,
    bytes: Uint8Array.from([1, 2, 3]),
  });
  const loaded = await loadStudioAppearance(saved.storage, assets.store, "alpha01");
  assert.equal(loaded.state, "original");
  assert.deepEqual(loaded.appearance, originalStudioAppearance());
  const savedCopy = saved.map.get("spread-studio.alpha01");
  const denied = await commitStudioAppearance(
    saved.storage,
    assets.store,
    "alpha01",
    appearance({ name: "Nope" }),
    {
      pendingAssetId: "photo-a",
    },
  );
  assert.equal(denied.ok, false);
  if (!denied.ok) assert.equal(denied.reason, "disabled");
  assert.equal(saved.map.get("spread-studio.alpha01"), savedCopy);
  assert.deepEqual([...(await assets.store.get("alpha01", "photo-a"))!.bytes], [1, 2, 3]);
});

test("persistence: replacing a wallpaper drops the previous asset and keeps the new one", async () => {
  const saved = memoryStorage();
  const assets = memoryAssets();
  await assets.store.put({
    id: "photo-a",
    profileId: "alpha01",
    format: "jpeg",
    width: 1,
    height: 1,
    bytes: Uint8Array.from([1]),
  });
  await assets.store.put({
    id: "photo-b",
    profileId: "alpha01",
    format: "jpeg",
    width: 1,
    height: 1,
    bytes: Uint8Array.from([2]),
  });
  assert.equal(
    (
      await commitStudioAppearance(
        saved.storage,
        assets.store,
        "alpha01",
        appearance({ wallpaperAssetId: "photo-a" }),
        {
          enabled: true,
        },
      )
    ).ok,
    true,
  );
  const replaced = await commitStudioAppearance(
    saved.storage,
    assets.store,
    "alpha01",
    appearance({ id: "look-b", name: "Next", wallpaperAssetId: "photo-b" }),
    { enabled: true, pendingAssetId: "photo-b" },
  );
  assert.equal(replaced.ok, true);
  assert.equal(await assets.store.get("alpha01", "photo-a"), null);
  assert.deepEqual([...(await assets.store.get("alpha01", "photo-b"))!.bytes], [2]);
  const loaded = await loadStudioAppearance(saved.storage, assets.store, "alpha01", {
    enabled: true,
  });
  assert.equal(loaded.state, "saved");
  assert.equal(loaded.appearance.wallpaperAssetId, "photo-b");
});

test("persistence: colors are stored in canonical form and an uppercase accent is accepted", async () => {
  const saved = memoryStorage();
  const look = appearance();
  look.palette = { ...look.palette, accent: "#ABCDEF" };
  assert.equal(
    (await commitStudioAppearance(saved.storage, null, "alpha01", look, { enabled: true })).ok,
    true,
  );
  const loaded = await loadStudioAppearance(saved.storage, null, "alpha01", { enabled: true });
  assert.equal(loaded.appearance.palette.accent, "#abcdef");
  assert.equal(saved.map.get("spread-studio.alpha01")?.includes("#ABCDEF"), false);
});

test("persistence: deleting a profile removes only that profile, and the sweep drops orphans", async () => {
  const saved = memoryStorage(plannerSeed());
  const assets = memoryAssets();
  await commitStudioAppearance(
    saved.storage,
    assets.store,
    "alpha01",
    appearance({ id: "look-a", name: "A" }),
    { enabled: true },
  );
  await commitStudioAppearance(
    saved.storage,
    assets.store,
    "beta02",
    appearance({ id: "look-b", name: "B" }),
    { enabled: true },
  );
  await assets.store.put({
    id: "photo-a",
    profileId: "alpha01",
    format: "jpeg",
    width: 1,
    height: 1,
    bytes: Uint8Array.from([1]),
  });
  await assets.store.put({
    id: "photo-b",
    profileId: "beta02",
    format: "webp",
    width: 1,
    height: 1,
    bytes: Uint8Array.from([2]),
  });
  const cleaned = await cleanupProfileStudioData(saved.storage, assets.store, "alpha01");
  assert.equal(cleaned.removedAppearance, true);
  assert.equal(cleaned.removedAssets, 1);
  assert.equal(saved.map.has("spread-studio.alpha01"), false);
  assert.equal(saved.map.has("spread-studio.beta02"), true);
  assert.deepEqual([...(await assets.store.get("beta02", "photo-b"))!.bytes], [2]);
  assert.equal(await assets.store.get("alpha01", "photo-a"), null);
  await assets.store.put({
    id: "photo-c",
    profileId: "gone99",
    format: "jpeg",
    width: 1,
    height: 1,
    bytes: Uint8Array.from([3]),
  });
  saved.map.set("spread-studio.gone99", JSON.stringify(appearance({ name: "Gone" })));
  const swept = await sweepOrphanStudioData(saved.storage, assets.store, ["beta02"]);
  assert.deepEqual(swept.removedProfiles.sort(), ["gone99"]);
  assert.equal(swept.removedAssets, 1);
  assert.equal(saved.map.has("spread-studio.beta02"), true);
  assert.equal(saved.map.has("spread.v1"), true);
  assert.equal(saved.map.get("spread-view.alpha01"), plannerSeed()["spread-view.alpha01"]);
  assert.ok(await assets.store.get("beta02", "photo-b"));
  const empty = await sweepOrphanStudioData(saved.storage, assets.store, []);
  assert.deepEqual(empty.removedProfiles, ["beta02"]);
  assert.equal(empty.removedAssets, 1);
  assert.equal(saved.map.get("spread.v1"), plannerSeed()["spread.v1"]);
  assert.equal(saved.map.has("spread-view.alpha01"), true);
});

test("persistence: backup entries are appearance JSON, and restore remaps profile ids without image bytes", async () => {
  const saved = memoryStorage(plannerSeed());
  const assets = memoryAssets();
  await assets.store.put({
    id: "photo-a",
    profileId: "alpha01",
    format: "jpeg",
    width: 2,
    height: 2,
    bytes: new TextEncoder().encode(SECRET),
  });
  const look = appearance({ id: "look-a", name: "Mine", wallpaperAssetId: "photo-a" });
  await commitStudioAppearance(saved.storage, assets.store, "alpha01", look, { enabled: true });
  await commitStudioAppearance(
    saved.storage,
    assets.store,
    "beta02",
    appearance({ id: "look-b", name: "Plain" }),
    { enabled: true },
  );
  saved.map.set("spread-studio.bad", "{");
  const entries = collectStudioBackupEntries(saved.storage);
  assert.deepEqual(entries.map((entry) => entry.profileId).sort(), ["alpha01", "beta02"]);
  const photo = entries.find((entry) => entry.profileId === "alpha01");
  assert.ok(photo);
  assert.equal(photo.wallpaperAssetId, "photo-a");
  assert.equal(photo.json.includes(SECRET), false);
  assert.equal(photo.json.includes("data:image"), false);
  const described = describeStudioBackupEntry(photo);
  assert.equal(described.appearanceJson, "included");
  assert.equal(described.imageBytes, "omitted");
  assert.equal(described.message, STUDIO_PERSISTENCE_MESSAGES.backupOmittedImage);
  assert.equal(describeStudioBackupEntry({ wallpaperAssetId: null }).message, null);
  const plan = planStudioAppearanceRestore(entries, { alpha01: "newalpha", beta02: "newbeta" });
  assert.deepEqual(plan.skipped, []);
  assert.deepEqual(plan.writes.map((write) => write.key).sort(), [
    "spread-studio.newalpha",
    "spread-studio.newbeta",
  ]);
  assert.equal(JSON.stringify(plan.writes).includes(SECRET), false);
  const restored = memoryStorage(plannerSeed());
  for (const write of plan.writes) restored.map.set(write.key, write.value);
  const loaded = await loadStudioAppearance(restored.storage, memoryAssets().store, "newalpha", {
    enabled: true,
  });
  assert.equal(loaded.state, "missing-image");
  assert.deepEqual(loaded.appearance, originalStudioAppearance());
  assert.equal(loaded.message, STUDIO_PERSISTENCE_MESSAGES.missingImage);
  assert.equal(loaded.stored?.wallpaperAssetId, "photo-a");
  assert.equal(restored.map.get("spread.v1"), plannerSeed()["spread.v1"]);
  const collided = planStudioAppearanceRestore(
    [
      { profileId: "alpha01", json: photo.json },
      {
        profileId: "beta02",
        json: entries.find((entry) => entry.profileId === "beta02")?.json ?? "",
      },
    ],
    { alpha01: "sameid1", beta02: "sameid1" },
  );
  assert.deepEqual(collided.skipped, ["beta02"]);
  assert.equal(collided.writes.length, 1);
  const junk = planStudioAppearanceRestore(
    [
      { profileId: "alpha01", json: '{"version":9}' },
      { profileId: "nope", json: photo.json },
    ],
    { alpha01: "newalpha" },
  );
  assert.deepEqual(junk.writes, []);
  assert.deepEqual(junk.skipped, ["alpha01", "nope"]);
  assert.equal(STUDIO_ASSET_MESSAGES.tooLarge.includes("20 MB"), true);
});

test("B4: cold-start sweep removes abandoned images within live profiles, preserves committed references", async () => {
  const saved = memoryStorage();
  const assets = memoryAssets();
  const put = async (id: string, profileId = "alpha01") =>
    assets.store.put({ id, profileId, format: "jpeg", width: 2, height: 2, bytes: Uint8Array.from([1, 2, 3]) });
  await put("committed");
  await put("cancelled");
  await put("crashed-import");
  await put("from-other-profile", "beta02");
  saved.storage.setItem(studioAppearanceKey("alpha01")!, JSON.stringify(appearance({
    id: "my-look", name: "My look", wallpaperAssetId: "committed",
  })));
  const count = await sweepUnreferencedStudioAssets(saved.storage, assets.store, ["alpha01", "beta02"]);
  assert.equal(count, 3);
  assert.ok(await assets.store.get("alpha01", "committed"));
  assert.equal(await assets.store.get("alpha01", "cancelled"), null);
  assert.equal(await assets.store.get("alpha01", "crashed-import"), null);
  assert.equal(await assets.store.get("beta02", "from-other-profile"), null);
  // Idempotent and profile-isolated: no subsequent change to the protected photo.
  assert.equal(await sweepUnreferencedStudioAssets(saved.storage, assets.store, ["alpha01", "beta02"]), 0);
  assert.ok(await assets.store.get("alpha01", "committed"));
});

test("B4: sweep preserves photos when appearance JSON is corrupt or storage cannot be read", async () => {
  const saved = memoryStorage({ "spread-studio.alpha01": "{unreadable-json" });
  const assets = memoryAssets();
  await assets.store.put({
    id: "only-copy", profileId: "alpha01", format: "jpeg", width: 1, height: 1, bytes: Uint8Array.from([4]),
  });
  assert.equal(await sweepUnreferencedStudioAssets(saved.storage, assets.store, ["alpha01"]), 0);
  assert.ok(await assets.store.get("alpha01", "only-copy"));
  const failure: StudioStorage = {
    ...saved.storage,
    getItem: () => { throw new Error("Storage unavailable"); },
  };
  assert.equal(await sweepUnreferencedStudioAssets(failure, assets.store, ["alpha01"]), 0);
  assert.ok(await assets.store.get("alpha01", "only-copy"));
});

test("B4: cold-start sweep never alters planner entries or cross-profile saved looks", async () => {
  const saved = memoryStorage(plannerSeed());
  const assets = memoryAssets();
  await assets.store.put({
    id: "beta-photo", profileId: "beta02", format: "webp", width: 2, height: 2, bytes: Uint8Array.from([3]),
  });
  saved.storage.setItem(studioAppearanceKey("beta02")!, JSON.stringify(appearance({
    name: "Beta", id: "beta-look", wallpaperAssetId: "beta-photo",
  })));
  const beforePlanner = saved.map.get("spread.v1");
  const count = await sweepUnreferencedStudioAssets(saved.storage, assets.store, ["alpha01", "beta02"]);
  assert.equal(count, 0);
  assert.equal(saved.map.get("spread.v1"), beforePlanner);
  assert.ok(await assets.store.get("beta02", "beta-photo"));
  assert.ok(saved.map.get(studioAppearanceKey("beta02")!));
});
