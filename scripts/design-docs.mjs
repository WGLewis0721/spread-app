// Keeps the design brain (docs/design) honest: links resolve, every document is on the map,
// every document links back to the map, the AI tool pointer files still point here, and the
// token-saving tiers hold: size budgets, a fresh rules card in every agent file, pack pointers
// that land on real headings, a fresh tokens.json, and a Summary line on long documents.
// Used by scripts/design-docs.test.mjs, which runs in `npm run test:scripts` and CI.
// `node scripts/design-docs.mjs --sync` rewrites the rules card copies.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";
import { renderTokens } from "./design-tokens.mjs";

const DESIGN_DIR = "docs/design";
const POINTER_FILES = ["CLAUDE.md", "GEMINI.md", ".github/copilot-instructions.md"];
const OTHER_LINKED_FILES = ["AGENTS.project.md", "DESIGN.md"];
const CARD_TARGETS = ["AGENTS.project.md", ...POINTER_FILES];
const CARD_START = "<!-- card:start -->";
const CARD_END = "<!-- card:end -->";
const COPY_START = "<!-- design-rules-card:start -->";
const COPY_END = "<!-- design-rules-card:end -->";

// Size budgets in bytes. They are what keeps each tier cheap to load.
export const BUDGETS = { card: 3000, map: 9000, pack: 6500, tokens: 4000 };
// Documents longer than this must open with a "> Summary:" line so a reader can decide to stop.
export const SUMMARY_OVER_BYTES = 6000;
const SUMMARY_EXEMPT = new Set(["README.md", "RULES_CARD.md"]);

function markdownFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return markdownFiles(full);
    return name.endsWith(".md") ? [full] : [];
  });
}

function withoutCodeFences(text) {
  return text.replace(/```[\s\S]*?```/g, "");
}

function brokenLinks(root, file) {
  const text = withoutCodeFences(readFileSync(join(root, file), "utf8"));
  const problems = [];
  for (const match of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = match[1];
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const path = target.split("#")[0];
    if (!path) continue;
    const resolved = normalize(join(root, dirname(file), path));
    if (!existsSync(resolved)) problems.push(`${file}: broken link to ${target}`);
  }
  return problems;
}

function stripFrontmatter(text) {
  return text.replace(/^---\n[\s\S]*?\n---\n/, "");
}

function bytes(text) {
  return Buffer.byteLength(text, "utf8");
}

// The block between the card markers in RULES_CARD.md, or null when there is no card.
export function readCard(root) {
  const path = join(root, DESIGN_DIR, "RULES_CARD.md");
  if (!existsSync(path)) return null;
  const text = readFileSync(path, "utf8");
  const start = text.indexOf(CARD_START);
  const end = text.indexOf(CARD_END);
  if (start < 0 || end < start) return null;
  return text.slice(start + CARD_START.length, end).trim();
}

function copyBlock(card) {
  return `${COPY_START}\n${card}\n${COPY_END}`;
}

// Copies the rules card into every agent file. Files without markers get the block appended.
export function syncRulesCard(root) {
  const card = readCard(root);
  if (!card) throw new Error(`${DESIGN_DIR}/RULES_CARD.md has no card block`);
  const changed = [];
  for (const file of CARD_TARGETS) {
    const path = join(root, file);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    const start = text.indexOf(COPY_START);
    const end = text.indexOf(COPY_END);
    const next =
      start >= 0 && end > start
        ? text.slice(0, start) + copyBlock(card) + text.slice(end + COPY_END.length)
        : `${text.replace(/\s*$/, "")}\n\n${copyBlock(card)}\n`;
    if (next !== text) {
      writeFileSync(path, next);
      changed.push(file);
    }
  }
  return changed;
}

function headingsOf(text) {
  return withoutCodeFences(text)
    .split("\n")
    .map((l) => /^#{1,6}\s+(.*?)\s*$/.exec(l))
    .filter(Boolean)
    .map((m) => m[1].toLowerCase());
}

// Packs point at exact sections as `path#Heading`. The path is under docs/design; the heading may be a prefix.
function packPointerProblems(root, file) {
  const problems = [];
  const text = readFileSync(join(root, file), "utf8");
  for (const match of text.matchAll(/`([^`#\s][^`#]*\.md)#([^`]+)`/g)) {
    const [, rel, heading] = match;
    const target = join(root, DESIGN_DIR, rel);
    if (!existsSync(target)) {
      problems.push(`${file}: pointer to missing file ${rel}`);
      continue;
    }
    const want = heading.trim().toLowerCase();
    if (!headingsOf(readFileSync(target, "utf8")).some((h) => h.startsWith(want))) {
      problems.push(`${file}: no heading starting "${heading}" in ${rel}`);
    }
  }
  return problems;
}

function tierProblems(root, docs) {
  const problems = [];
  const designRoot = join(root, DESIGN_DIR);

  const card = readCard(root);
  if (card) {
    if (bytes(card) > BUDGETS.card) problems.push(`${DESIGN_DIR}/RULES_CARD.md: card is ${bytes(card)} bytes, budget ${BUDGETS.card}`);
    for (const file of CARD_TARGETS) {
      const path = join(root, file);
      if (!existsSync(path)) continue;
      const text = readFileSync(path, "utf8");
      const start = text.indexOf(COPY_START);
      const end = text.indexOf(COPY_END);
      if (start < 0 || end < start) problems.push(`${file}: missing the rules card block (run npm run docs:sync)`);
      else if (text.slice(start + COPY_START.length, end).trim() !== card) problems.push(`${file}: rules card is stale (run npm run docs:sync)`);
    }
  }

  const mapPath = join(designRoot, "README.md");
  if (bytes(readFileSync(mapPath, "utf8")) > BUDGETS.map) problems.push(`${DESIGN_DIR}/README.md: map is over its ${BUDGETS.map} byte budget`);

  const tokensPath = join(designRoot, "tokens.json");
  if (existsSync(tokensPath) && existsSync(join(root, "src/styles.css"))) {
    const current = readFileSync(tokensPath, "utf8");
    if (bytes(current) > BUDGETS.tokens) problems.push(`${DESIGN_DIR}/tokens.json: over its ${BUDGETS.tokens} byte budget`);
    if (current !== renderTokens(root)) problems.push(`${DESIGN_DIR}/tokens.json: stale (run npm run docs:tokens)`);
  }

  for (const file of docs) {
    const inside = relative(designRoot, join(root, file));
    const text = readFileSync(join(root, file), "utf8");
    if (inside.startsWith("packs/")) {
      if (bytes(text) > BUDGETS.pack) problems.push(`${file}: pack is ${bytes(text)} bytes, budget ${BUDGETS.pack}`);
      problems.push(...packPointerProblems(root, file));
    }
    const exempt = SUMMARY_EXEMPT.has(inside) || inside.startsWith("packs/") || inside.startsWith("specs/");
    if (!exempt && bytes(text) > SUMMARY_OVER_BYTES) {
      const head = stripFrontmatter(text).split("\n").slice(0, 14).join("\n");
      if (!/^> Summary:/m.test(head)) problems.push(`${file}: over ${SUMMARY_OVER_BYTES} bytes and has no "> Summary:" line near the top`);
    }
  }
  return problems;
}

export function checkDesignDocs(root) {
  const problems = [];
  const designRoot = join(root, DESIGN_DIR);
  const mapPath = join(designRoot, "README.md");
  if (!existsSync(mapPath)) return [`${DESIGN_DIR}/README.md is missing`];
  const map = readFileSync(mapPath, "utf8");

  const docs = markdownFiles(designRoot).map((f) => relative(root, f));
  for (const file of docs) problems.push(...brokenLinks(root, file));

  for (const file of docs) {
    const inside = relative(designRoot, join(root, file));
    if (inside === "README.md") continue;
    const isFolderIndex = inside.endsWith("/README.md");
    if (isFolderIndex) {
      if (!map.includes(`${dirname(inside)}/`)) problems.push(`${file}: folder ${dirname(inside)}/ is not on the map`);
    } else if (/^specs\/\d{4}-\d{2}-\d{2}-.+\.md$/.test(inside)) {
      // Dated specs are listed on the specs index, not on the map, so the map stays small.
      const index = join(designRoot, "specs/README.md");
      const indexed = existsSync(index) && readFileSync(index, "utf8").includes(inside.slice("specs/".length));
      if (!indexed) problems.push(`${file}: not on the specs index (${DESIGN_DIR}/specs/README.md must list it)`);
    } else if (!map.includes(inside)) {
      problems.push(`${file}: not on the map (${DESIGN_DIR}/README.md must mention ${inside})`);
    }
    const body = stripFrontmatter(readFileSync(join(root, file), "utf8"));
    const head = body.split("\n").slice(0, 8).join("\n");
    if (!/\]\((\.\.\/)*README\.md\)/.test(head)) problems.push(`${file}: does not link back to the design map near the top`);
  }

  for (const file of POINTER_FILES) {
    if (!existsSync(join(root, file))) {
      problems.push(`${file}: missing`);
      continue;
    }
    const text = readFileSync(join(root, file), "utf8");
    for (const needed of ["docs/design/README.md", "PLAN_SPEC_PROTOCOL.md"]) {
      if (!text.includes(needed)) problems.push(`${file}: does not mention ${needed}`);
    }
    problems.push(...brokenLinks(root, file));
  }

  for (const file of OTHER_LINKED_FILES) {
    if (existsSync(join(root, file))) problems.push(...brokenLinks(root, file));
  }
  const rootDesign = join(root, "DESIGN.md");
  if (existsSync(rootDesign) && !readFileSync(rootDesign, "utf8").includes("docs/design/landing/DESIGN.md")) {
    problems.push("DESIGN.md: root stub does not point to docs/design/landing/DESIGN.md");
  }
  problems.push(...tierProblems(root, docs));
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes("--sync")) {
    const changed = syncRulesCard(process.cwd());
    console.error(changed.length ? `design-docs: updated ${changed.join(", ")}` : "design-docs: rules card copies already current");
    process.exit(0);
  }
  const problems = checkDesignDocs(process.cwd());
  for (const p of problems) console.error(p);
  console.error(problems.length ? `design-docs: ${problems.length} problem(s)` : "design-docs: ok");
  process.exit(problems.length ? 1 : 0);
}
