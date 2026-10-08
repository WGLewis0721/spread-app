/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// Lets node's test runner import app modules that use the "@/" alias, exactly as the bundler does.
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    const base = root + specifier.slice(2);
    for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
      if (existsSync(candidate) && !candidate.endsWith("/") && /\.[a-z]+$/.test(candidate)) return next(pathToFileURL(candidate).href, context);
    }
  }
  try {
    return await next(specifier, context);
  } catch (error) {
    // The bundler accepts extensionless relative imports; node does not.
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && error?.code === "ERR_MODULE_NOT_FOUND") {
      for (const suffix of [".ts", ".tsx", "/index.ts"]) {
        try {
          return await next(specifier + suffix, context);
        } catch {
          /* try the next */
        }
      }
    }
    throw error;
  }
}
