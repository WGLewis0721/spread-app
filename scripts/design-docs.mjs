// Keeps the design brain (docs/design) honest: links resolve, every document is on the map,
// every document links back to the map, and the AI tool pointer files still point here.
// Used by scripts/design-docs.test.mjs, which runs in `npm run test:scripts` and CI.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";

const DESIGN_DIR = "docs/design";
const POINTER_FILES = ["CLAUDE.md", "GEMINI.md", ".github/copilot-instructions.md"];
const OTHER_LINKED_FILES = ["AGENTS.project.md", "DESIGN.md"];

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
    } else if (!map.includes(inside)) {
      problems.push(`${file}: not on the map (${DESIGN_DIR}/README.md must mention ${inside})`);
    }
    const body = readFileSync(join(root, file), "utf8").replace(/^---\n[\s\S]*?\n---\n/, "");
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
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const problems = checkDesignDocs(process.cwd());
  for (const p of problems) console.error(p);
  console.error(problems.length ? `design-docs: ${problems.length} problem(s)` : "design-docs: ok");
  process.exit(problems.length ? 1 : 0);
}
