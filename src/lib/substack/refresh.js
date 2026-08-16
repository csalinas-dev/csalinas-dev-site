// The trigger: visiting the blog keeps the mirror fresh.
//
// The only file here that touches Next.js, and it touches it once —
// `after(cb)`, which runs `cb` AFTER THE RESPONSE IS FINISHED. That single fact
// is the whole safety argument: the page is already on the wire before a byte
// leaves for Substack, so a slow, down or garbage feed cannot reach a visitor.
// The blog renders from MySQL exactly as it would have (src/lib/blog degrades to
// the stored rows on its own).
//
// WHY NOT AWAIT IT. Awaiting is the naive reading of "sync on page load" and the
// worst option available here. Traffic is sparse, so with any TTL worth having
// MOST visitors would be the cold one — the cost would be the norm, not an
// amortized outlier — and it would put a third party on the critical path of a
// page that today makes zero third-party server calls. The price of not awaiting
// is that the visitor who triggers a sync does not see its result; the next one
// does. For a newsletter that publishes every few days, nobody can perceive that.
//
// DO NOT LET EITHER BLOG ROUTE LOSE `export const dynamic = "force-dynamic"`.
// `after` in a STATIC page runs at build time, and the Docker image runs
// `next build` before the deploy runs `prisma db push` — a page that lost the
// line would try to sync against a database with no table.
import { after } from "next/server";

import { createRefreshGate } from "./throttle";

// TEN MINUTES. Staleness is bounded by this plus one page view. Substack emails
// subscribers the instant a post goes out, so the site mirror trailing by ten
// minutes is invisible for a publication whose cadence is measured in days. On
// the cost side it caps outbound fetches at 6/hour even under continuous
// traffic, while a quiet day costs zero because nothing runs unless somebody
// visits. 60s (the GitHub card's number) buys nothing: that TTL is set by what
// the card DISPLAYS, and a miss there is one GraphQL read where a miss here
// re-sanitizes and re-hashes every item in the feed. An hour was rejected on one
// scenario — publish a post, open the site to look, and it isn't there. Ten
// minutes makes "give it a minute" true.
const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

// After two minutes a run is presumed wedged and a new one may start. feed.js
// already bounds its own fetch at 15s, so reaching this means something stranger
// than a slow feed — and a stuck promise must not disable the feature forever.
const MAX_RUN_MS = 2 * 60 * 1000;

// Pinned to globalThis for the same reason src/lib/prisma.js pins its client:
// two route entries importing this module must not end up with two gates (the
// interval would double in effect and the single-flight would stop spanning
// them), and dev-mode HMR must not reset the throttle on every edit.
const GATE = Symbol.for("csalinas.substack.refreshGate");

const gate = () => {
  if (!globalThis[GATE]) {
    globalThis[GATE] = createRefreshGate({
      // Imported INSIDE the callback, so the ingestion graph (sanitize-html,
      // fast-xml-parser, Prisma) never reaches the blog routes' render path.
      run: async () => {
        const { runSubstackSync } = await import("./run");

        return runSubstackSync();
      },
      intervalMs: REFRESH_INTERVAL_MS,
      maxRunMs: MAX_RUN_MS,
    });
  }

  return globalThis[GATE];
};

/**
 * Register a post-response Substack refresh. Call it as the first statement of a
 * blog route; it is free to call more than once per request, because the gate
 * collapses the second call onto the first's promise.
 *
 * DOES EXACTLY ONE THING: registers the callback. No await, no import, no
 * database, no work of any kind in the calling frame — the render must not be
 * able to pay for anything here.
 */
export function scheduleSubstackRefresh() {
  try {
    after(() => gate()());
  } catch (error) {
    // `after` outside a request scope, or any other framework-level surprise.
    // A stale blog is a smaller problem than a page that does not render.
    console.error(`[substack] refresh could not be scheduled (${error?.name ?? "unknown"})`);
  }
}
