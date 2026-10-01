import { spawn } from "node:child_process";
import { execSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "dist-ios");
const port = 8096;

execSync("npx vite build", {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, SPREAD_PAGES_BASE: "" },
});

const preview = spawn("npx", ["vite", "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
  cwd: root,
  env: { ...process.env, SPREAD_PAGES_BASE: "" },
  stdio: "ignore",
});

const html = await waitFor(`http://127.0.0.1:${port}/`);
preview.kill("SIGTERM");

const cleaned = html
  .replace('<script src="https://grok.com/grok-app-builder/extensions.js" defer></script>', "")
  .replace('<link rel="manifest" href="/__grok/manifest.webmanifest"/>', "")
  .replace(/<link rel="apple-touch-icon" href="\/__grok\/icon-180\.png"\s*\/?>/, "");

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, "assets"), { recursive: true });
writeFileSync(join(out, "index.html"), cleaned);
cpSync(join(root, ".vercel/output/static/assets"), join(out, "assets"), { recursive: true });
cpSync(join(root, ".vercel/output/static/favicon.svg"), join(out, "favicon.svg"));
cpSync(join(root, ".vercel/output/static/fonts"), join(out, "fonts"), { recursive: true });
cpSync(join(root, ".vercel/output/static/icons"), join(out, "icons"), { recursive: true });
cpSync(join(root, "public/icons"), join(out, "icons"), { recursive: true });

if (!cleaned.includes("/assets/")) throw new Error("iOS html is missing bundled assets");
console.log("iOS web bundle ready", out);

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
