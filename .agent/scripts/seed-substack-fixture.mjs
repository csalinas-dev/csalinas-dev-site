// Seeds a throwaway database with synced posts, from a fixture. No network.
//
//   DATABASE_URL="mysql://root:pw@127.0.0.1:33153/blog" \
//     node .agent/scripts/seed-substack-fixture.mjs .agent/fixtures/substack/feed-base.xml
//
// Runs the REAL syncSubstackPosts against the REAL prismaStore, with `readFeed`
// returning the fixture file instead of fetching. So what lands in the table is
// what ingestion actually produces — a hand-written INSERT would prove the
// renderer works on rows the renderer's author invented.
//
// SAFETY RAIL, and not an optional one: this writes rows, and the `.env` that
// lands in an agent worktree is not guaranteed to point at a throwaway database.
// It refuses to run unless DATABASE_URL's host is localhost, and --force is a
// deliberate act. The URL itself is NEVER printed — it carries a password.
import { register } from "node:module";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Same re-exec as verify-substack-sync.mjs: the module's `.js` files sit under a
// package.json with no `"type"`, so Node warns once per file about reparsing
// them as ESM. Silence that ONE code, not every warning.
const SILENCE = "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON";

if (!process.execArgv.includes(SILENCE)) {
  const { status } = spawnSync(
    process.execPath,
    [SILENCE, fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    { stdio: "inherit" }
  );

  process.exit(status ?? 1);
}

const USAGE = "usage: node .agent/scripts/seed-substack-fixture.mjs <fixture.xml> [--force]";

const argv = process.argv.slice(2);
const force = argv.includes("--force");
const fixturePath = argv.find((arg) => !arg.startsWith("--"));

if (!fixturePath) {
  console.error(`seed-substack-fixture.mjs: missing <fixture.xml>\n${USAGE}`);
  process.exit(2);
}

if (!existsSync(fixturePath)) {
  console.error(`seed-substack-fixture.mjs: no such fixture: ${fixturePath}`);
  process.exit(2);
}

// ── the rail ───────────────────────────────────────────────────────────────
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

const databaseHost = () => {
  const url = process.env.DATABASE_URL;

  if (!url) return null;

  try {
    // A mysql:// URL parses as a URL; `hostname` strips the credentials, so
    // nothing secret is ever returned from here.
    return new URL(url).hostname;
  } catch {
    return null;
  }
};

const host = databaseHost();

if (!force && !LOCAL_HOSTS.has(host ?? "")) {
  console.error(
    "seed-substack-fixture.mjs: refusing to write.\n" +
      `  DATABASE_URL points at ${host ? `host "${host}"` : "an unparseable URL"}, not localhost.\n` +
      "  This script INSERTS rows. Point it at a throwaway database, or pass --force if you\n" +
      "  are certain (the .env provisioned into a worktree is not necessarily a throwaway)."
  );
  process.exit(2);
}

if (force && !LOCAL_HOSTS.has(host ?? "")) {
  console.error(`seed-substack-fixture.mjs: --force given; writing to a NON-LOCAL host ("${host}").`);
}

// ── run the real sync over the fixture ─────────────────────────────────────
// Two hooks: the shared one for the repo's extensionless relative imports, and
// the alias one because store.js reaches `@/lib/prisma`. The alias hook is NOT
// registered by the verify scripts — see its header for why.
register("./lib/esm-resolver.mjs", import.meta.url);
register("./lib/alias-resolver.mjs", import.meta.url);

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");

const { syncSubstackPosts } = await import(
  pathToFileURL(join(ROOT, "src/lib/substack/sync.js")).href
);
const { prismaStore } = await import(
  pathToFileURL(join(ROOT, "src/lib/substack/store.js")).href
);

const xml = readFileSync(resolve(fixturePath), "utf8");

const report = await syncSubstackPosts({
  feedUrl: `file://${resolve(fixturePath)}`,
  readFeed: async () => xml,
  store: prismaStore,
});

// The report's `posts` carry slugs and actions, never content.
console.log(
  JSON.stringify(
    {
      ok: report.ok,
      itemsSeen: report.itemsSeen,
      created: report.created,
      updated: report.updated,
      unchanged: report.unchanged,
      skipped: report.skipped,
      posts: report.posts.map(({ slug, action, reason }) => ({ slug, action, reason })),
      errors: report.errors,
    },
    null,
    2
  )
);

process.exit(report.ok ? 0 : 1);
