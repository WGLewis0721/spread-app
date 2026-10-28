// Generates docs/design/tokens.json from src/styles.css so agents read the planner's tokens as
// data (a few hundred tokens) instead of reading CSS or prose. The CSS stays the single source of
// truth; scripts/design-docs.test.mjs fails if tokens.json is out of date.
//
//   node scripts/design-tokens.mjs --write   regenerate docs/design/tokens.json
//   node scripts/design-tokens.mjs           print it
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// What each token is for. Source: docs/design/planner/SPREAD_DESIGN_SYSTEM.md, Tokens table.
export const TOKEN_ROLES = {
  "--canvas": "the page, and rows that sit on a card",
  "--elevated": "cards and sheets",
  "--ink": "strongest text",
  "--secondary": "secondary text",
  "--tertiary": "quietest text; also the no-role-color fallback dot",
  "--line": "hairlines",
  "--fill": "quiet buttons",
  "--segment": "selected segment in segmented controls",
  "--accent": "the one interactive color: links, primary buttons, Today marker, drop highlight",
  "--on-accent": "text and icons on --accent",
  "--danger": "destructive actions and save failures",
  "--on-danger": "text and icons on --danger",
  "--caution": "warnings that are not failures",
  "--glass": "fill of the floating glass dock (utility class `glass`)",
  "--glass-stroke": "outer hairline of the glass dock",
  "--glass-line": "inner highlight and dividers on the glass dock",
  "--scrim": "behind sheets",
  "--shadow": "under floating things",
};

function block(css, header) {
  const start = css.indexOf(header);
  if (start < 0) throw new Error(`design-tokens: ${header} not found in styles.css`);
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  throw new Error(`design-tokens: unterminated block ${header}`);
}

function declarations(body, filter) {
  const out = {};
  for (const m of body.matchAll(/^\s*(--[\w-]+)\s*:\s*([^;]+);/gm)) {
    if (filter(m[1])) out[m[1]] = m[2].trim().replace(/\s+/g, " ");
  }
  return out;
}

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(tsx?|css)$/.test(name) && !name.endsWith("styles.css") ? [full] : [];
  });
}

// Whether any component actually uses a --radius-* token (by var() or by its Tailwind class).
function radiusUsage(root, names) {
  const text = sourceFiles(join(root, "src")).map((f) => readFileSync(f, "utf8")).join("\n");
  return Object.fromEntries(
    names.map((n) => [n, text.includes(`var(${n})`) || text.includes(`rounded-${n.replace("--radius-", "")}`)]),
  );
}

export function buildTokens(css, root) {
  const colorKey = (k) => k in TOKEN_ROLES;
  const light = declarations(block(css, "\n:root {"), colorKey);
  const dark = declarations(block(css, ':root[data-theme="dark"] {'), colorKey);
  const theme = block(css, "@theme inline {");
  const scale = declarations(theme, (k) => /^--(radius|text)-/.test(k));
  const font = declarations(block(css, "\n:root {"), (k) => k === "--font-sans")["--font-sans"];
  const roles = Object.fromEntries(Object.keys(light).map((k) => [k, TOKEN_ROLES[k]]));
  const radii = Object.keys(scale).filter((k) => k.startsWith("--radius-"));
  return {
    note: "Generated from src/styles.css by scripts/design-tokens.mjs. Do not edit by hand. Use tokens, never raw values. Role colors are data in src/lib/spread/model.ts, not tokens.",
    modes: "light is :root and [data-theme=\"light\"]; dark is [data-theme=\"dark\"] and the prefers-color-scheme block (same values)",
    roles,
    light,
    dark,
    scale,
    radiusTokensUsedByComponents: root ? radiusUsage(root, radii) : "not checked",
    cardRadiusInPractice: "Tailwind rounded-3xl on cards; rows on a card use rounded-2xl (see planner/SPREAD_DESIGN_SYSTEM.md Patterns)",
    font,
  };
}

export function renderTokens(root) {
  return `${JSON.stringify(buildTokens(readFileSync(join(root, "src/styles.css"), "utf8"), root), null, 2)}\n`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = renderTokens(process.cwd());
  if (process.argv.includes("--write")) {
    writeFileSync(join(process.cwd(), "docs/design/tokens.json"), out);
    console.error("design-tokens: wrote docs/design/tokens.json");
  } else process.stdout.write(out);
}
