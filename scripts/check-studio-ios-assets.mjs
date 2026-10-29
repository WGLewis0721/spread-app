#!/usr/bin/env node
/**
 * Fail closed if the actual offline iOS bundle was compiled without
 * the Studio gate. Run after export:ios / ios:sync, never against source files.
 * No network access, no signing material, and no native project mutation.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const output = join(process.cwd(), "dist-ios", "assets");
const assets = readdirSync(output, { recursive: true })
  .filter((file) => typeof file === "string" && file.endsWith(".js"));
if (!assets.length) throw new Error("No compiled iOS JavaScript assets found");

let appearanceAttributeFound = false;
let studioWeekInteractionFound = false;
for (const relativePath of assets) {
  const contents = readFileSync(join(output, relativePath), "utf8");
  appearanceAttributeFound ||= contents.includes("data-studio-appearance");
  // Apple-style Studio uses a three-detent Week control, not the retired Customize editor.
  // This is a Studio-only interaction whose JSX is eliminated when VITE_SPREAD_STUDIO=0.
  studioWeekInteractionFound ||= contents.includes("studio-week-grab-control");
}

if (!appearanceAttributeFound || !studioWeekInteractionFound) {
  throw new Error(
    "Studio enabled release verification failed: compiled iOS bundle lacks " +
      [!appearanceAttributeFound && "data-studio-appearance", !studioWeekInteractionFound && "studio-week-grab-control"]
        .filter(Boolean)
        .join(" and "),
  );
}
console.log("Studio enabled iOS bundle verified: appearance scope + three-detent Week control present");
