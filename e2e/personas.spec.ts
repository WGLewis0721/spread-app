import { test } from "./fixtures";
import { runPersona } from "./personas/engine";
import { personas } from "./personas/personas";

test.describe.configure({ timeout: 600_000 });

for (const persona of personas) {
  test(`persona: ${persona.name}`, async ({ planner, diagnostics }) => {
    await runPersona(persona, planner, test.info(), diagnostics.consoleErrors);
  });
}
