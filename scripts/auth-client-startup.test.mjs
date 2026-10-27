import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { createAuthClient } from "better-auth/react";

// Execute the actual client module with the bundler's env replacement and URL
// resolution. Keep the real Better Auth dependency so its URL validation runs.
function clientModule() {
  const path = new URL("../src/lib/auth/client.ts", import.meta.url);
  let source = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  const providers = ts.transpileModule(readFileSync(new URL("./providers.ts", path), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  source = source
    .replace(
      '"better-auth/client/plugins"',
      JSON.stringify(import.meta.resolve("better-auth/client/plugins")),
    )
    .replace('"better-auth/react"', JSON.stringify(import.meta.resolve("better-auth/react")))
    .replace(
      '"../../../scripts/sign-out-plan.mjs"',
      JSON.stringify(new URL("sign-out-plan.mjs", import.meta.url).href),
    )
    .replace(
      '"./providers"',
      JSON.stringify(`data:text/javascript;base64,${Buffer.from(providers).toString("base64")}`),
    )
    .replaceAll("import.meta.env.VITE_AUTH_ENABLED", '"true"');
  return `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
}

test("native module startup skips web auth; web actions reuse the real auth client", async () => {
  const previousWindow = globalThis.window;
  const previousFetch = globalThis.fetch;
  let requests = 0;
  try {
    globalThis.window = { location: { origin: "capacitor://localhost" } };
    globalThis.fetch = () => {
      requests++;
      throw new Error("network must not be used");
    };
    assert.throws(
      () => createAuthClient(),
      /Invalid base URL/,
      "the real dependency reproduces the installed-app crash when eagerly initialized",
    );
    const client = await import(clientModule());
    assert.equal(
      typeof client.getAuthClient,
      "function",
      "native import completes without initializing auth",
    );
    assert.equal(requests, 0);

    globalThis.window = { location: { origin: "https://thespreadapp.com" } };
    const web = client.getAuthClient();
    assert.equal(client.getAuthClient(), web, "session hooks share a stable client");
    assert.equal(typeof web.signIn.email, "function");
    assert.equal(typeof web.useSession, "function");
    assert.equal(requests, 0, "constructing the client makes no auth request");
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    globalThis.fetch = previousFetch;
  }
});
