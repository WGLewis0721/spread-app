import test from "node:test";
import assert from "node:assert/strict";
import { installBrowser } from "../../test-support/browser-env.ts";
import { defaultData, STORE_KEY } from "./model.ts";
const storage = installBrowser();
const { useSpread } = await import("./store.ts");
const { installNativeV2Host } = await import("./native-v2-host.ts");
test("live host round trip edits real state, refuses malformed messages, and removes endpoint on disposal", async () => {
  const data = defaultData();
  storage.map.set(STORE_KEY, JSON.stringify(data));
  useSpread.setState({ ready: true, activeId: "live", profiles: [], data });
  const dispose = installNativeV2Host();
  const host = (
    window as unknown as { SpreadNativeHost: { exchange(message: string): Promise<string> } }
  ).SpreadNativeHost;
  try {
    const initial = JSON.parse(await host.exchange("null"));
    const state = initial.state;
    const request = {
      protocolVersion: 1,
      sessionId: state.sessionId,
      requestId: "roundtrip",
      expectedProfileId: "live",
      expectedWeek: data.currentWeek,
      expectedRevision: state.revision,
      action: { type: "addTask", roleId: data.hats[0].id, text: "Live bridge" },
    };
    const result = JSON.parse(await host.exchange(JSON.stringify(request)));
    assert.equal(result.ok, true);
    assert.equal(
      result.state.envelope.snapshot.tasks.filter((t: { text: string }) => t.text === "Live bridge")
        .length,
      1,
    );
    assert.equal(JSON.parse(await host.exchange(JSON.stringify(request))).ok, true);
    assert.equal(JSON.parse(await host.exchange("{bad")).error, "invalid-message");
    assert.ok(storage.map.get(STORE_KEY)?.includes("Live bridge"));
  } finally {
    dispose();
  }
  assert.equal("SpreadNativeHost" in window, false);
});
