// Offline-first proof: with every network door throwing, the planner still plans and saves.
import assert from "node:assert/strict";
import test from "node:test";
import { installBrowser } from "../../test-support/browser-env.ts";
import { defaultData, STORE_KEY, type SpreadData } from "./model.ts";
import { PROFILES_KEY, profileStore, type Profile } from "./profiles.ts";

const storage = installBrowser();
let attempts = 0;
const g = globalThis as unknown as Record<string, unknown>;
g.fetch = () => {
  attempts++;
  throw new TypeError("offline");
};
g.XMLHttpRequest = class {
  constructor() {
    attempts++;
    throw new TypeError("offline");
  }
};
g.WebSocket = class {
  constructor() {
    attempts++;
    throw new TypeError("offline");
  }
};
g.EventSource = class {
  constructor() {
    attempts++;
    throw new TypeError("offline");
  }
};
const nav = g.navigator as { sendBeacon?: unknown } | undefined;
if (nav) {
  nav.sendBeacon = () => {
    attempts++;
    return false;
  };
}

const { useSpread } = await import("@/lib/spread/store");
const local: Profile = { id: "local", name: "Local", store: profileStore("local"), theme: "light", accent: null };

function seed() {
  const data: SpreadData = defaultData();
  const week = data.weeks[data.currentWeek];
  week.boxes[0].hours = 8;
  week.allocations = [];
  storage.map.clear();
  storage.failWhen = null;
  storage.map.set(STORE_KEY, JSON.stringify(data));
  storage.map.set(PROFILES_KEY, JSON.stringify([local]));
  useSpread.setState({ profiles: [local], activeId: local.id, data });
  attempts = 0;
  return week.boxes[0].hatId;
}

test("planning a week with no network makes no network call and is saved to the device", () => {
  const hat = seed();
  const s = useSpread.getState();
  s.addTask(hat, "Draft the plan");
  s.addAllocation(hat, "2026-09-27", 2);
  const week = () => useSpread.getState().data.weeks[useSpread.getState().data.currentWeek];
  const taskId = week().boxes[0].tasks[0].id;
  const allocId = week().allocations[0].id;
  assert.deepEqual(s.assignTask(hat, taskId, allocId), { ok: true, changed: true });
  s.moveAllocation(allocId, "2026-09-28");
  const edit = s.undoable(() => s.setAllocationHours(allocId, 1));
  assert.ok(edit);
  assert.equal(s.undoEdit(edit as string), true);
  s.toggleTask(hat, taskId);
  assert.equal(attempts, 0, "nothing reached for the network");
  const saved = JSON.parse(storage.map.get(STORE_KEY) as string) as SpreadData;
  assert.deepEqual(saved.weeks[saved.currentWeek], week(), "what is on screen is what is on the device");
});

test("a reload (fresh read of what was saved) gives the same plan back", () => {
  const hat = seed();
  useSpread.getState().addTask(hat, "Survives a restart");
  const before = JSON.stringify(useSpread.getState().data);
  const stored = storage.map.get(STORE_KEY) as string;
  assert.equal(JSON.stringify(JSON.parse(stored)), before);
  assert.equal(attempts, 0);
});

test("carrying tasks over and reviewing the week are offline too", () => {
  const hat = seed();
  useSpread.getState().addTask(hat, "Carry me");
  const id = useSpread.getState().data.weeks[useSpread.getState().data.currentWeek].boxes[0].tasks[0].id;
  assert.equal(useSpread.getState().carryOver([{ hatId: hat, taskId: id }]), 1);
  assert.equal(attempts, 0);
});
