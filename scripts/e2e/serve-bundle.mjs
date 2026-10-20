#!/usr/bin/env node
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "dist-ios");
const port = Number(process.env.E2E_PORT || 8197);

if (!existsSync(join(root, "index.html"))) {
  console.error("dist-ios/index.html is missing. Run `npm run export:ios` (or `npm run e2e:build`) first.");
  process.exit(1);
}

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".json": "application/json",
};

createServer((req, res) => {
  const pathname = decodeURIComponent((req.url ?? "/").split("?")[0]);
  let file = normalize(join(root, pathname));
  if (file !== root && !file.startsWith(root + sep)) {
    res.writeHead(403).end();
    return;
  }
  if (!existsSync(file) || statSync(file).isDirectory()) {
    if (extname(pathname)) {
      res.writeHead(404).end();
      return;
    }
    file = join(root, "index.html");
  }
  res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
  createReadStream(file).pipe(res);
}).listen(port, "127.0.0.1", () => console.log(`Serving dist-ios on http://127.0.0.1:${port}`));
