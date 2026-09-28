import { spawn } from "node:child_process";
import { execSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "dist-pages");
const port = 8095;

execSync("npx vite build", {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, SPREAD_PAGES_BASE: "/spread-app" },
});

const preview = spawn("npx", ["vite", "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
  cwd: root,
  env: { ...process.env, SPREAD_PAGES_BASE: "/spread-app" },
  stdio: "ignore",
});

const html = await waitFor(`http://127.0.0.1:${port}/spread-app/`);
preview.kill("SIGTERM");

const cleaned = html
  .replace('<script src="https://grok.com/grok-app-builder/extensions.js" defer></script>', "")
  .replace('<link rel="manifest" href="/__grok/manifest.webmanifest"/>', "")
  .replace(
    /<link rel="apple-touch-icon" href="\/__grok\/icon-180\.png"\s*\/?>/,
    '<link rel="apple-touch-icon" href="/spread-app/icon-180.png"/>',
  )
  .replace('href="/favicon.svg"', 'href="/spread-app/favicon.svg"');

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, "assets"), { recursive: true });
writeFileSync(join(out, "index.html"), cleaned);
writeFileSync(join(out, ".nojekyll"), "");
cpSync(join(root, ".vercel/output/static/assets"), join(out, "assets"), { recursive: true });
cpSync(join(root, ".vercel/output/static/favicon.svg"), join(out, "favicon.svg"));
// the landing type and the app icons are public files; Pages needs them beside the page
cpSync(join(root, ".vercel/output/static/fonts"), join(out, "fonts"), { recursive: true });
cpSync(join(root, ".vercel/output/static/icons"), join(out, "icons"), { recursive: true });
cpSync(join(root, "public/__grok/icon-180.png"), join(out, "icon-180.png"));
cpSync(join(root, "public/icons"), join(out, "icons"), { recursive: true });
if (!cleaned.includes("/spread-app/assets/")) throw new Error("pages html is missing assets");
console.log("pages ready", out);

function waitFor(url) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const response = await fetch(url);
        if (response.ok) {
          resolve(await response.text());
          return;
        }
      } catch {
        // preview is still starting
      }
      if (Date.now() - started > 60000) {
        preview.kill("SIGTERM");
        reject(new Error("preview did not start"));
        return;
      }
      setTimeout(tick, 300);
    };
    tick();
  });
}
