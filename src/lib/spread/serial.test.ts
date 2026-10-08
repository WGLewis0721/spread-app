import assert from "node:assert/strict";
import test from "node:test";
import { createSerial } from "./serial.ts";

test("jobs never overlap and run in the order requested", async () => {
  const serial = createSerial();
  let running = 0;
  let overlapped = false;
  const order: number[] = [];
  const job = (n: number, ms: number) => () =>
    (async () => {
      running += 1;
      if (running > 1) overlapped = true;
      await new Promise((r) => setTimeout(r, ms));
      order.push(n);
      running -= 1;
    })();
  await Promise.all([serial(job(1, 20)), serial(job(2, 1)), serial(job(3, 5))]);
  assert.equal(overlapped, false);
  assert.deepEqual(order, [1, 2, 3]);
});

test("a failing job does not stop the ones after it, and still reports its own error", async () => {
  const serial = createSerial();
  const failed = serial(async () => {
    throw new Error("boom");
  });
  const after = serial(async () => "ok");
  await assert.rejects(failed, /boom/);
  assert.equal(await after, "ok");
});
