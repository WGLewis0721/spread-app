import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { BUDGETS, SUMMARY_OVER_BYTES, checkDesignDocs, syncRulesCard } from "./design-docs.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function write(root, file, text) {
  mkdirSync(dirname(join(root, file)), { recursive: true });
  writeFileSync(join(root, file), text);
}

const POINTER = "See [map](docs/design/README.md) and docs/design/PLAN_SPEC_PROTOCOL.md.\n";

function healthyTree() {
  const root = mkdtempSync(join(tmpdir(), "design-docs-"));
  write(root, "docs/design/README.md", "# Map\n\nSee planner/RULES.md and PLAN_SPEC_PROTOCOL.md and specs/.\n");
  write(root, "docs/design/planner/RULES.md", "# Rules\n\n> [map](../README.md)\n");
  write(root, "docs/design/PLAN_SPEC_PROTOCOL.md", "# Protocol\n\n> [map](README.md)\n");
  write(root, "docs/design/specs/README.md", "# Specs\n\n> [map](../README.md)\n");
  for (const f of ["CLAUDE.md", "GEMINI.md"]) write(root, f, POINTER);
  write(root, ".github/copilot-instructions.md", POINTER.replace("(docs/", "(../docs/"));
  return root;
}

test("the real repository's design docs are consistent", () => {
  assert.deepEqual(checkDesignDocs(REPO_ROOT), []);
});

test("a healthy tree has no problems", () => {
  assert.deepEqual(checkDesignDocs(healthyTree()), []);
});

test("a broken relative link is reported", () => {
  const root = healthyTree();
  write(root, "docs/design/planner/RULES.md", "# Rules\n\n> [map](../README.md)\n\n[gone](missing.md)\n");
  assert.ok(checkDesignDocs(root).some((p) => p.includes("broken link to missing.md")));
});

test("a document missing from the map or without a link back is reported", () => {
  const root = healthyTree();
  write(root, "docs/design/planner/ORPHAN.md", "# Orphan\n");
  const problems = checkDesignDocs(root);
  assert.ok(problems.some((p) => p.includes("ORPHAN.md: not on the map")));
  assert.ok(problems.some((p) => p.includes("ORPHAN.md: does not link back")));
});

test("a pointer file that stops pointing at the design brain is reported", () => {
  const root = healthyTree();
  write(root, "GEMINI.md", "Do things.\n");
  assert.ok(checkDesignDocs(root).some((p) => p.includes("GEMINI.md: does not mention docs/design/README.md")));
});

const CARD = "<!-- card:start -->\nRule one.\n<!-- card:end -->\n";
const COPY = (body) => `<!-- design-rules-card:start -->\n${body}\n<!-- design-rules-card:end -->\n`;

function treeWithCard(copyBody = "Rule one.") {
  const root = healthyTree();
  write(root, "docs/design/RULES_CARD.md", `# Card\n\n> [map](README.md)\n\n${CARD}`);
  write(root, "docs/design/README.md", "# Map\n\nSee planner/RULES.md and PLAN_SPEC_PROTOCOL.md and specs/ and RULES_CARD.md and packs/p.md.\n");
  for (const f of ["CLAUDE.md", "GEMINI.md"]) write(root, f, POINTER + COPY(copyBody));
  write(root, ".github/copilot-instructions.md", POINTER.replace("(docs/", "(../docs/") + COPY(copyBody));
  return root;
}

test("a tree with a fresh rules card has no problems", () => {
  assert.deepEqual(checkDesignDocs(treeWithCard()), []);
});

test("a stale or missing card copy is reported and sync repairs it", () => {
  const root = treeWithCard("Old rule.");
  const problems = checkDesignDocs(root);
  assert.ok(problems.some((p) => p.includes("CLAUDE.md: rules card is stale")));
  write(root, "GEMINI.md", POINTER);
  assert.ok(checkDesignDocs(root).some((p) => p.includes("GEMINI.md: missing the rules card block")));
  assert.ok(syncRulesCard(root).length >= 2);
  assert.deepEqual(checkDesignDocs(root), []);
});

test("an oversized card, map or pack is reported", () => {
  const root = treeWithCard();
  write(root, "docs/design/RULES_CARD.md", `# Card\n\n> [map](README.md)\n\n<!-- card:start -->\n${"x".repeat(BUDGETS.card + 1)}\n<!-- card:end -->\n`);
  assert.ok(checkDesignDocs(root).some((p) => p.includes("card is") && p.includes("budget")));
  const root2 = treeWithCard();
  write(root2, "docs/design/packs/p.md", `# Pack\n\n> [map](../README.md)\n\n${"y".repeat(BUDGETS.pack + 1)}\n`);
  assert.ok(checkDesignDocs(root2).some((p) => p.includes("p.md: pack is")));
});

test("pack pointers must land on a real file and heading", () => {
  const root = treeWithCard();
  write(root, "docs/design/planner/RULES.md", "# Rules\n\n> [map](../README.md)\n\n## 4. Gates and more\n");
  write(root, "docs/design/packs/p.md", "# Pack\n\n> [map](../README.md)\n\n- `planner/RULES.md#4. Gates`: ok prefix\n");
  assert.deepEqual(checkDesignDocs(root), []);
  write(root, "docs/design/packs/p.md", "# Pack\n\n> [map](../README.md)\n\n- `planner/RULES.md#Nope`: bad\n- `planner/GONE.md#Gates`: bad\n");
  const problems = checkDesignDocs(root);
  assert.ok(problems.some((p) => p.includes('no heading starting "Nope"')));
  assert.ok(problems.some((p) => p.includes("missing file planner/GONE.md")));
});

test("a long document needs a Summary line", () => {
  const root = healthyTree();
  const filler = "word ".repeat(SUMMARY_OVER_BYTES / 5 + 10);
  write(root, "docs/design/planner/RULES.md", `# Rules\n\n> [map](../README.md)\n\n${filler}\n`);
  assert.ok(checkDesignDocs(root).some((p) => p.includes('no "> Summary:" line')));
  write(root, "docs/design/planner/RULES.md", `# Rules\n\n> [map](../README.md)\n\n> Summary: short.\n\n${filler}\n`);
  assert.deepEqual(checkDesignDocs(root), []);
});

test("a dated spec must be on the specs index, not the map", () => {
  const root = healthyTree();
  write(root, "docs/design/specs/2026-01-01-x.md", "# X\n\n> [map](../README.md)\n");
  assert.ok(checkDesignDocs(root).some((p) => p.includes("not on the specs index")));
  write(root, "docs/design/specs/README.md", "# Specs\n\n> [map](../README.md)\n\n| 2026-01-01 | [X](2026-01-01-x.md) |\n");
  assert.deepEqual(checkDesignDocs(root), []);
});
