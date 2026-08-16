// One sync, from either trigger. The read path (src/lib/substack/refresh.js) and
// the deploy (scripts/sync-substack.mjs) both come through here, so the report,
// the durable record and the alert are decided once rather than twice.
//
// NO NEXT.JS IMPORT IN THIS FILE. `scripts/sync-substack.mjs` loads it under
// plain `node` inside a throwaway container; an `after` or a `next/headers`
// here would break that entry point.
//
// NEVER THROWS. Both callers are background contexts with nobody to catch.
import { getFeedUrl } from "./config";
import { recordSyncOutcome } from "./status";

// A report for a failure that happened before `syncSubstackPosts` could produce
// one of its own — shaped exactly like a feed-scope failure, because that is
// what it is: nothing was read and nothing was written.
const failedBefore = (feedUrl, message) => {
  const startedAt = new Date();

  return {
    ok: false,
    feedUrl,
    startedAt,
    finishedAt: startedAt,
    durationMs: 0,
    itemsSeen: 0,
    created: 0,
    updated: 0,
    unchanged: 0,
    skipped: 0,
    posts: [],
    errors: [{ scope: "feed", message }],
  };
};

/**
 * @returns {Promise<{ report: object, status: object|null }>}
 */
export async function runSubstackSync() {
  let feedUrl;

  try {
    // NOT left to the default parameter. `getFeedUrl()` is the default value of
    // `syncSubstackPosts({ feedUrl })`, so an unset or non-https
    // SUBSTACK_FEED_URL throws BEFORE the function body runs and before any
    // report exists — the throw would escape past every catch inside sync.js.
    // Calling it here is what turns that into a reportable failure. Its own
    // messages are ours, and safe to print.
    feedUrl = getFeedUrl();
  } catch (error) {
    return await settle(failedBefore(null, error.message));
  }

  console.info("[substack] refresh: starting");

  let report;

  try {
    // Dynamic on purpose, and for the same reason sync.js dynamically imports
    // ./store: a static import would drag sanitize-html, fast-xml-parser and
    // parse-srcset into every blog route's server bundle and run
    // `auditAllowlist()` on the render path.
    const { syncSubstackPosts } = await import("./sync");

    // Nothing else is passed. No `store` (the default resolves prismaStore
    // lazily), no `readFeed`, no `reservedSlugs`.
    report = await syncSubstackPosts({ feedUrl });
  } catch (error) {
    // syncSubstackPosts catches feed-scope and per-item store errors; it does
    // NOT catch a throw from `await import("./store")`, i.e. PrismaClient
    // construction. By code, never `error.message` — an unknown throw could be
    // carrying anything, including a connection string.
    report = failedBefore(feedUrl, `sync failed (${error?.code ?? error?.name ?? "unknown"})`);
  }

  return await settle(report);
}

// Record, alert, log. Exactly one log line per run, with a stable prefix so the
// verification can count them.
const settle = async (report) => {
  const status = await recordSyncOutcome(report);

  if (report.ok) {
    console.info(
      `[substack] refresh: ok — ${report.itemsSeen} seen, ${report.created} created, ` +
        `${report.updated} updated, ${report.unchanged} unchanged, ${report.skipped} skipped`
    );
  } else {
    console.error(
      `[substack] refresh: FAILED — ${report.errors[0]?.message ?? "unknown"}; serving stored posts`
    );
  }

  if (status) {
    const { notifySyncStatus } = await import("./alert");

    await notifySyncStatus(status);
  }

  return { report, status };
};
