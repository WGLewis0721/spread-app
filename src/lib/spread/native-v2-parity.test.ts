import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { projectNativeV2 } from "./native-v2-projection.ts";
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
