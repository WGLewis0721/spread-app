#!/usr/bin/env node
// Runs node's test runner and fails if it ran fewer tests than expected. A glob that matches
// nothing, a renamed suite, or a runner that quietly executes zero tests must turn CI red, not green.
//
//   node scripts/run-tests.mjs --min 190 --find scripts .test.mjs
//   node scripts/run-tests.mjs --min 250 --node-arg=--experimental-strip-types -- file1.ts file2.ts
import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
let min = 1;
const files = [];
const nodeArgs = [];
for (let i = 0; i < args.length; i += 1) {
  const a = args[i];
  if (a === "--min") min = Number(args[++i]);
  else if (a === "--find") {
    const dir = args[++i];
    const suffix = args[++i];
    const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : n.endsWith(suffix) ? [join(d, n)] : []));
    files.push(...walk(dir).sort());
  } else if (a.startsWith("--node-arg=")) nodeArgs.push(a.slice("--node-arg=".length));
  else if (a === "--") {
    files.push(...args.slice(i + 1));
    i = args.length;
  }
  else files.push(a);
}
if (!Number.isFinite(min) || files.length === 0) {
  console.error(`run-tests: no test files given (got ${files.length}). Refusing to report success.`);
  process.exit(2);
}
const run = spawnSync(process.execPath, [...nodeArgs, "--test", ...files], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
process.stdout.write(run.stdout);
process.stderr.write(run.stderr);
const count = (name) => Number((new RegExp(`^# ${name} (\\d+)`, "m").exec(run.stdout) ?? [])[1] ?? NaN);
const ran = count("tests");
const skipped = count("skipped");
console.error(`run-tests: ${ran} tests (${count("pass")} passed, ${count("fail")} failed, ${Number.isNaN(skipped) ? 0 : skipped} skipped) from ${files.length} files; minimum ${min}`);
if (!(ran >= min)) {
  console.error(`run-tests: expected at least ${min} tests but the runner executed ${Number.isNaN(ran) ? "none" : ran}. Failing so a silent exclusion cannot pass.`);
  process.exit(3);
}
process.exit(run.status ?? 1);
