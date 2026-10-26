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
let editorLabelFound = false;
for (const relativePath of assets) {
  const contents = readFileSync(join(output, relativePath), "utf8");
  appearanceAttributeFound ||= contents.includes("data-studio-appearance");
  editorLabelFound ||= contents.includes("Customize Spread");
}

if (!appearanceAttributeFound || !editorLabelFound) {
  throw new Error(
    "Studio enabled release verification failed: compiled iOS bundle lacks " +
      [!appearanceAttributeFound && "data-studio-appearance", !editorLabelFound && "Customize Spread"]
        .filter(Boolean)
        .join(" and "),
  );
}
console.log("Studio enabled iOS bundle verified: appearance scope + Customize editor present");
