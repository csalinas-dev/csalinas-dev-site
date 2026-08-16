// Run one Substack sync from a shell. The deploy's entry point, and the way to
// run it by hand.
//
//   docker compose run --rm app node scripts/sync-substack.mjs
//   DATABASE_URL=… SUBSTACK_FEED_URL=… npm run sync:substack
//
// STDOUT IS THE MARKDOWN SUMMARY AND NOTHING ELSE, EVER. The deploy step pipes
// it straight into $GITHUB_STEP_SUMMARY, so one stray console.log corrupts the
// run page. Everything for a human — including run.js's own log lines — goes to
// stderr.
//
// Exit codes: 0 clean, 1 feed-scope failure (the sync is broken), 2 item-scope
// errors only (one post is broken, the sync is fine), 3 the wiring itself could
// not start. 2 MUST NEVER BE PROMOTED TO 1.
//
// NEVER PRINTS, on any path: DATABASE_URL, a Prisma error.message (P1001's
// carries the database host and this repo's logs are public), or anything that
// is not already a field of the report — part 1's `reportable()` guarantees the
// report is free of article HTML, so do not reach around it.
import { register } from "node:module";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Same re-exec as .agent/scripts/seed-substack-fixture.mjs: the application's
// `.js` files sit under a package.json with no `"type"`, so Node warns once per
// file about reparsing them as ESM. Silence that ONE code, not every warning —
// and on stderr it would be harmless, but the habit is worth keeping.
const SILENCE = "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON";

if (!process.execArgv.includes(SILENCE)) {
  const { status } = spawnSync(
    process.execPath,
    [SILENCE, fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    { stdio: "inherit" }
  );

  process.exit(status ?? 3);
}

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

// The two resolve hooks are RUNTIME DEPENDENCIES OF PRODUCTION now, not agent
// tooling: this script runs inside the deployed image. `.dockerignore` excludes
// only .git, node_modules, .next and npm-debug.log, so `.agent/scripts/lib/` is
// in the image — and if somebody ever adds `.agent/` to it, the failure must be
// this sentence rather than a resolver stack trace.
const HOOKS = [
  ".agent/scripts/lib/esm-resolver.mjs",
  ".agent/scripts/lib/alias-resolver.mjs",
];

for (const hook of HOOKS) {
  if (!existsSync(join(ROOT, hook))) {
    console.error(
      `sync-substack.mjs: missing ${hook}\n` +
        "  It is a runtime dependency of this script, not agent tooling. If .agent/ was\n" +
        "  added to .dockerignore, that is the cause."
    );
    process.exit(3);
  }
}

for (const hook of HOOKS) register(pathToFileURL(join(ROOT, hook)).href);

const load = (path) => import(pathToFileURL(join(ROOT, path)).href);

let exitCode = 3;
let prisma = null;

try {
  const { classify, summaryMarkdown } = await load("scripts/lib/sync-report.mjs");
  const { runSubstackSync } = await load("src/lib/substack/run.js");

  ({ prisma } = await load("src/lib/prisma.js"));

  const { report, status } = await runSubstackSync();

  // The one and only thing that may reach stdout.
  process.stdout.write(summaryMarkdown(report, { status }));

  exitCode = classify(report);

  console.error(
    report.ok
      ? `substack sync: ok, ${report.created} created, ${report.updated} updated, ` +
          `${report.unchanged} unchanged, ${report.skipped} skipped`
      : `substack sync: FAILED — ${report.errors[0]?.message ?? "unknown"}`
  );
} catch (error) {
  // By name/code. An unknown throw from module loading or client construction
  // could be carrying a connection string in its message.
  console.error(`sync-substack.mjs: could not run (${error?.code ?? error?.name ?? "unknown"})`);
  exitCode = 3;
} finally {
  // Or `docker compose run` never returns: an open pool keeps the loop alive.
  try {
    await prisma?.$disconnect();
  } catch {
    // A failed disconnect is not worth changing the exit code over.
  }
}

// NOT process.exit(): stdout to a pipe can be truncated mid-write.
process.exitCode = exitCode;
