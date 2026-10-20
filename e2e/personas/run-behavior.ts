import { test } from "../fixtures";
import { BEHAVIOR_TITLES, personasByBehavior } from "./index";
import { runPersona, type Behavior } from "./engine";

/** Registers one persona walkthrough per persona of the behavior. Run with `npx playwright test e2e/journeys`. */
export function registerPersonas(behavior: Behavior) {
  test.describe(`${BEHAVIOR_TITLES[behavior]}: persona walkthroughs`, () => {
    test.describe.configure({ timeout: 600_000 });
    for (const persona of personasByBehavior[behavior]) {
      test(`${persona.name}`, async ({ planner, diagnostics, deviceFiles, hits }) => {
        await runPersona(persona, planner, test.info(), diagnostics.consoleErrors, deviceFiles, hits);
      });
    }
  });
}
