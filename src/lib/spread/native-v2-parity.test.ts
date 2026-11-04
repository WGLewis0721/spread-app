import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { projectNativeV2 } from "./native-v2-projection.ts";
import { suggestFreeTime } from "./free-time.ts";
import { remainingHours, type SpreadData } from "./model.ts";
const vectors = JSON.parse(
  readFileSync(
    new URL(
      "../../../ios/SpreadNativeV2/Tests/SpreadNativeV2Tests/Fixtures/parity-v1.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as {
  data: SpreadData;
  envelope: ReturnType<typeof projectNativeV2>;
  remaining: number;
  eligible: string[];
}[];
for (const [i, vector] of vectors.entries()) {
  test(`shared Swift/TypeScript vector ${i}: bank, profile, week, eligibility, projection`, () => {
    const before = JSON.stringify(vector.data);
    const actual = projectNativeV2(vector.data, vector.envelope.profileId);
    assert.deepEqual(actual, vector.envelope);
    assert.equal(
      remainingHours(
        actual.snapshot.roles[0].hours,
        vector.data.weeks[vector.data.currentWeek].allocations,
        "r",
      ),
      vector.remaining,
    );
    assert.deepEqual(
      actual.snapshot.allocations.filter((a) => a.roleId === "r" && a.hours > 0).map((a) => a.id),
      vector.eligible,
    );
    assert.equal(JSON.stringify(vector.data), before);
  });
}

const freeTimeVectors = JSON.parse(readFileSync(new URL(
  "../../../ios/SpreadNativeV2/Tests/SpreadNativeV2Tests/Fixtures/free-time-v1.json", import.meta.url), "utf8")) as {
    data: SpreadData; snapshot: ReturnType<typeof projectNativeV2>["snapshot"]; today: string;
    expected: { roleId: string; day: string; hours: number }[];
  }[];
test("sixty shared Free time vectors pin native suggestions to the real TypeScript planner", () => {
  assert.equal(freeTimeVectors.length, 60);
  for (const vector of freeTimeVectors) {
    const before = JSON.stringify(vector.data);
    assert.deepEqual(projectNativeV2(vector.data, "parity").snapshot, vector.snapshot);
    const result = suggestFreeTime(vector.data, vector.today);
    assert.deepEqual(result.kind === "suggestions" ? result.items.map((s) => ({ roleId: s.hatId, day: s.day, hours: s.hours })) : [], vector.expected);
    assert.equal(JSON.stringify(vector.data), before);
  }
});
