import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test as base, expect, type Page } from "@playwright/test";

const here = dirname(fileURLToPath(import.meta.url));
const NATIVE_INIT = readFileSync(join(here, "..", "scripts", "ios-bridge-sim", "native-init.js"), "utf8");

/** Wednesday 4 March 2026, so the visible week is always Mar 2 – Mar 8 and no test depends on the day it runs. */
export const FIXED_NOW = new Date(2026, 2, 4, 10, 0, 0);

export type Diagnostics = {
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
  externalRequests: string[];
};

type Fixtures = {
  /** Console, page and network problems seen during the test, attached to the report when there are any. */
  diagnostics: Diagnostics;
  /** Opens the installed-app build of Spread on a clean device and waits for the planner. */
  planner: Page;
  /** The raw device-files map behind the fake native bridge (what the iPhone app would persist). */
  deviceFiles: Map<string, string>;
};

/**
 * Spread's web build is gated by a server-side beta sign-in. The installed-app build has no sign-in and runs the
 * same planner code, so the suite runs that bundle against the repo's own fake Capacitor bridge
 * (scripts/ios-bridge-sim/native-init.js). Nothing here talks to any real service: every non-local request is
 * aborted and recorded, and each test starts on an empty device.
 */
export const test = base.extend<Fixtures>({
  deviceFiles: async ({}, use) => {
    await use(new Map());
  },

  diagnostics: async ({}, use, testInfo) => {
    const d: Diagnostics = { consoleErrors: [], pageErrors: [], failedRequests: [], externalRequests: [] };
    await use(d);
    if (d.consoleErrors.length || d.pageErrors.length || d.failedRequests.length || d.externalRequests.length) {
      await testInfo.attach("diagnostics.json", { body: JSON.stringify(d, null, 2), contentType: "application/json" });
    }
  },

  context: async ({ context, deviceFiles }, use) => {
    await context.exposeFunction("__fsRead", (path: string) => deviceFiles.get(path) ?? null);
    await context.exposeFunction("__fsWrite", (path: string, data: string) => void deviceFiles.set(path, data));
    await context.addInitScript(NATIVE_INIT);
    await use(context);
  },

  planner: async ({ page, baseURL, diagnostics }, use) => {
    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      // WebKit logs this for the `interactive-widget` viewport key (Chromium-only); it is harmless and tracked as polish.
      if (msg.text().includes("interactive-widget")) return;
      diagnostics.consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => diagnostics.pageErrors.push(String(err.message || err)));
    page.on("requestfailed", (req) => {
      if (req.url().startsWith(baseURL!)) diagnostics.failedRequests.push(`${req.method()} ${req.url()} ${req.failure()?.errorText ?? ""}`);
    });
    await page.route("**/*", (route) => {
      const url = route.request().url();
      if (url.startsWith(baseURL!) || url.startsWith("data:") || url.startsWith("blob:")) return route.continue();
      diagnostics.externalRequests.push(url);
      return route.abort();
    });
    await page.clock.setFixedTime(FIXED_NOW);
    await page.goto("/");
    // A cold WebKit boot on a busy CI runner can take several seconds; the default 5s flaked.
    await expect(page.getByRole("tab", { name: "Spread" })).toBeVisible({ timeout: 20_000 });
    await use(page);
    expect(diagnostics.pageErrors, "uncaught page errors").toEqual([]);
    expect(diagnostics.externalRequests, "requests that left the device").toEqual([]);
  },
});

export { expect };
