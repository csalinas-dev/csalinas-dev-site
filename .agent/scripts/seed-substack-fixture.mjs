// Seeds a throwaway database with synced posts, from a fixture. No network.
//
// THE CANONICAL RECIPE for getting a database the blog gates can be seeded into
// lives here, and every other place that mentions this script points at it. Six
// copies of it had drifted apart before it was written down once (#166).
//
// A worktree does not arrive with a database this may be pointed at, and there
// is no step below that reads, copies, prints or filters a configuration file to
// find one — you make a throwaway, use it, and destroy it. Derive the container
// name and BOTH ports from your issue number so two agents on this machine can
// never collide, and write the connection string out literally on each command:
// shell state does not survive between an agent's tool calls, and the password
// is one you invented for a container you are about to delete.
//
//   docker run -d --name issue166-mysql -e MYSQL_ROOT_PASSWORD=issue166 \
//     -e MYSQL_DATABASE=csalinas -p 127.0.0.1:33166:3306 mysql:8.0
//   npm ci
//   npx prisma generate
//   DATABASE_URL="mysql://root:issue166@127.0.0.1:33166/csalinas" \
//     npx prisma db push --skip-generate
//   DATABASE_URL="mysql://root:issue166@127.0.0.1:33166/csalinas" \
//     node .agent/scripts/seed-substack-fixture.mjs .agent/fixtures/substack/feed-overflow.xml
//
// Then tear the container down — this is a step, not an afterthought; a stray
// container holds its port against the next agent who derives the same one:
//
//   docker rm -f issue166-mysql
//
// TWO FAILURES THAT DO NOT LOOK LIKE THEIR CAUSE, both of which have already
// cost this repo agent-rounds. Check them before concluding the recipe is wrong:
//
//   - `docker run` returns before MySQL is accepting connections. A `db push`
//     that fails to connect seconds after the container starts means it is still
//     initialising. Wait and re-run it.
//   - `npx prisma` with no node_modules present silently downloads the NEWEST
//     Prisma, which rejects this repo's v6 schema with P1012 — a message that
//     reads like a database connection failure. `npm ci` comes first, always.
//
// Serving the seeded rows, for the gates that need a running site — a fresh
// worktree has no build, so there is one:
//
//   DATABASE_URL="mysql://root:issue166@127.0.0.1:33166/csalinas" npm run build
//   DATABASE_URL="mysql://root:issue166@127.0.0.1:33166/csalinas" \
//     ./node_modules/.bin/next start -p 3166
//   node .agent/scripts/verify-blog-overflow.mjs http://127.0.0.1:3166
//
// Blog routes are force-dynamic, so a post seeded AFTER that build is on the
// page without rebuilding — seed order does not matter, only that both halves
// carry the same DATABASE_URL. Kill the server by the PID listening on your own
// port (`netstat -ano | grep ':3166.*LISTENING'`), never by image name: other
// agents on this machine are running node too.
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
