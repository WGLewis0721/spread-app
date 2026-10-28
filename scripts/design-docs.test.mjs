import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { checkDesignDocs } from "./design-docs.mjs";

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
