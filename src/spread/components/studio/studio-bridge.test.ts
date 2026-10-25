import assert from "node:assert/strict";
import test from "node:test";
import { originalStudioAppearance, parseStudioAppearance } from "../../../lib/spread/studio/contract.ts";
import type { AssetByteStore, AssetRecord } from "../../../lib/spread/studio/assets-store.ts";
import { STUDIO_APPEARANCE_KEY_PREFIX, type StudioStorage } from "../../../lib/spread/studio/persistence.ts";
import { reduceStudioSession } from "./draft.ts";
import { commitDraft, importDraftPhoto, loadSession } from "./studio-bridge.ts";

const PLANNER = JSON.stringify({ marker: "PLANNER-BYTE-MARKER", tasks: ["Outline the chapter"] });
const PROFILE = "profile1";

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  let writes = 0;
  const storage: StudioStorage = {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      writes += 1;
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
    writes: () => writes,
  };
}

function memoryAssets() {
  const rows = new Map<string, AssetRecord>();
  let writes = 0;
  const store: AssetByteStore = {
    async put(record) {
      writes += 1;
      rows.set(`${record.profileId}/${record.id}`, { ...record, bytes: new Uint8Array(record.bytes) });
      return "ok";
    },
    async get(profileId, id) {
      const row = rows.get(`${profileId}/${id}`);
      return row ? { ...row, bytes: new Uint8Array(row.bytes) } : null;
    },
    async delete(profileId, id) {
      rows.delete(`${profileId}/${id}`);
    },
    async list() {
      return [...rows.values()].map((row) => ({ id: row.id, profileId: row.profileId }));
    },
  };
  return { store, writes: () => writes };
}

test("preview edits do not write and apply writes appearance without planner bytes", async () => {
  const saved = memoryStorage();
  const assets = memoryAssets();
  let state = await loadSession({
    storage: saved.storage,
    assets: assets.store,
    profileId: PROFILE,
    enabled: true,
    planner: PLANNER,
  });
  assert.equal(saved.writes(), 0);
  state = reduceStudioSession(state, { type: "set-mode", mode: "dark" }).state;
  state = reduceStudioSession(state, { type: "set-color", key: "accent", value: "#224466" }).state;
  assert.equal(saved.writes(), 0);
  assert.equal(assets.writes(), 0);
  const wrote = await commitDraft({
    storage: saved.storage,
    assets: assets.store,
    profileId: PROFILE,
    session: state,
    enabled: true,
    planner: PLANNER,
  });
  assert.equal(wrote.wrote, true);
  assert.equal(wrote.session.committed.mode, "dark");
  assert.equal(wrote.session.planner, PLANNER);
  const raw = saved.map.get(`${STUDIO_APPEARANCE_KEY_PREFIX}${PROFILE}`);
  assert.equal(typeof raw, "string");
  assert.equal(raw?.includes("PLANNER-BYTE-MARKER"), false);
  assert.equal(raw?.includes("data:"), false);
  const parsed = parseStudioAppearance(JSON.parse(raw ?? "null"));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.value.mode, "dark");
  assert.equal(parsed.value.palette.accent, "#224466");
});

test("flag off and a changed plan do not write, and cancel is not a write", async () => {
  const custom = { ...originalStudioAppearance(), id: "custom", name: "Custom", mode: "light" as const };
  const key = `${STUDIO_APPEARANCE_KEY_PREFIX}${PROFILE}`;
  const saved = memoryStorage({ [key]: JSON.stringify(custom) });
  const assets = memoryAssets();
  const hidden = await loadSession({
    storage: saved.storage,
    assets: assets.store,
    profileId: PROFILE,
    enabled: false,
    planner: PLANNER,
  });
  assert.equal(hidden.draft.id, "original");
  assert.equal(saved.writes(), 0);
  const visible = await loadSession({
    storage: saved.storage,
    assets: assets.store,
    profileId: PROFILE,
    enabled: true,
    planner: PLANNER,
  });
  assert.equal(visible.draft.mode, "light");
  const edited = reduceStudioSession(visible, { type: "set-mode", mode: "dark" }).state;
  const blocked = await commitDraft({
    storage: saved.storage,
    assets: assets.store,
    profileId: PROFILE,
    session: edited,
    enabled: false,
    planner: PLANNER,
  });
  assert.equal(blocked.wrote, false);
  assert.equal(saved.map.get(key), JSON.stringify(custom));
  const drifted = await commitDraft({
    storage: saved.storage,
    assets: assets.store,
    profileId: PROFILE,
    session: edited,
    enabled: true,
    planner: JSON.stringify({ marker: "OTHER" }),
  });
  assert.equal(drifted.wrote, false);
  assert.equal(saved.map.get(key), JSON.stringify(custom));
  const cancelled = reduceStudioSession(edited, { type: "cancel" });
  assert.equal(cancelled.effect.type, "none");
  assert.equal(saved.writes(), 0);
  assert.deepEqual(cancelled.state.draft, visible.committed);
});

test("a photo that cannot be read is not saved and asks for a smaller one", async () => {
  const saved = memoryStorage();
  const assets = memoryAssets();
  const state = await loadSession({
    storage: saved.storage,
    assets: assets.store,
    profileId: PROFILE,
    enabled: true,
    planner: PLANNER,
  });
  const result = await importDraftPhoto({
    session: state,
    profileId: PROFILE,
    bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
    store: assets.store,
    enabled: true,
  });
  assert.match(result.message ?? "", /could not be read/);
  assert.match(result.message ?? "", /smaller photo/);
  assert.equal(result.effect.type, "none");
  assert.equal(saved.writes(), 0);
  assert.equal(assets.writes(), 0);
  assert.equal(result.session.draft.wallpaperAssetId, undefined);
  assert.equal(result.session.planner, PLANNER);
});
