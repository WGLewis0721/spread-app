import { spawn } from "node:child_process";
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "dist-ios");
const port = 8096;

// A preview server left over from an earlier run would answer on this port and hand back the
// previous build's HTML, which points at asset files this build no longer has (a blank app).
if (await respondsOn(`http://127.0.0.1:${port}/`)) {
  throw new Error(`Port ${port} is already serving something. Stop the old "vite preview" process and run this again.`);
}

execSync("npx vite build", {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, SPREAD_PAGES_BASE: "" },
});

// Its own process group, so stopping it also stops the vite process that npx starts.
const preview = spawn("npx", ["vite", "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
  cwd: root,
  env: { ...process.env, SPREAD_PAGES_BASE: "" },
  stdio: "ignore",
  detached: true,
});
let previewExited = false;
preview.on("exit", () => {
  previewExited = true;
});

let html;
try {
  html = await waitFor(`http://127.0.0.1:${port}/`);
} finally {
  stopPreview();
}

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

// Every file the page asks for must be in the bundle. The installed app has no server to fall
// back on, so a single missing script is a blank screen.
const wanted = [...new Set([...cleaned.matchAll(/(?:src|href)="(\/[^"#?]+)"/g)].map((match) => match[1]))];
const missing = wanted.filter((path) => !existsSync(join(out, path)));
if (missing.length > 0) {
  throw new Error(`iOS bundle is missing files the page loads: ${missing.join(", ")}`);
}
console.log(`iOS web bundle ready ${out} (${wanted.length} referenced files, none missing)`);

function stopPreview() {
  if (previewExited || !preview.pid) return;
  try {
    process.kill(-preview.pid, "SIGTERM");
  } catch {
    preview.kill("SIGTERM");
  }
}

async function respondsOn(url) {
  try {
    await fetch(url);
    return true;
  } catch {
    return false;
  }
}

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
      if (previewExited) {
        reject(new Error("vite preview stopped before it answered"));
        return;
      }
      if (Date.now() - started > 60000) {
        reject(new Error("preview did not start"));
        return;
      }
      setTimeout(tick, 300);
    };
    tick();
  });
}
