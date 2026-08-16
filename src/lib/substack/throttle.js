// A single-flight, interval-bounded gate around a side effect.
//
// Zero imports on purpose: `.agent/scripts/verify-substack-refresh.mjs` loads
// this file under plain `node` with no resolve hook at all, which is what makes
// the stampede proof cheap enough to run on every change.
//
// WHY THIS IS NOT `unstable_cache` (src/lib/github/api.js is the precedent, and
// it is the right tool *there*). Three reasons, and each one is load-bearing:
//
//   1. `unstable_cache` memoizes a RETURN VALUE. What has to be bounded here is
//      a WRITE. Nobody renders the sync report; the blog reads MySQL directly on
//      every request (`force-dynamic`, and src/lib/blog/README.md says "No
//      cache" deliberately).
//   2. IT PROVIDES NO SINGLE-FLIGHT. React's `cache` dedupes within one render
//      pass; `unstable_cache` does not coalesce concurrent misses across
//      requests. For a GraphQL read a duplicated miss costs a wasted fetch. Here
//      it costs two concurrent writers on the same rows. `applyPost`'s P2002
//      re-read path means we survive that, but "we survive a stampede" is not
//      "we prevent one".
//   3. Its entry is data Next may evict whenever it likes, which would silently
//      un-throttle a write path.
//
// The shape is instead the one src/lib/rate-limit.js already uses — module-level
// state in a single-container deployment — with the instance pinned to
// `globalThis` by the caller (src/lib/substack/refresh.js), the way
// src/lib/prisma.js pins its client.

/**
 * @param {object} options
 * @param {() => Promise<unknown>} options.run        the side effect to bound
 * @param {number} options.intervalMs                 minimum spacing between STARTS
 * @param {number} options.maxRunMs                   after this, a run is presumed wedged
 * @param {() => number} [options.now]                injectable clock, for the verify script
 * @returns {() => Promise<unknown> | null} `refresh()` — the in-flight promise,
 *   a new one, or `null` when the interval has not elapsed.
 */
export function createRefreshGate({ run, intervalMs, maxRunMs, now = () => Date.now() }) {
  let lastStartedAt = -Infinity;
  let inFlight = null;
  let inFlightAt = 0;

  return function refresh() {
    const t = now();

    // ── THE SINGLE-FLIGHT INVARIANT ────────────────────────────────────────
    // Everything from here to the assignment of `inFlight` below runs in ONE
    // synchronous turn. Node is single-threaded, so no second caller can
    // observe the gate half-updated — that, and only that, is what makes ten
    // simultaneous requests produce one sync.
    //
    // AN `await` ANYWHERE BETWEEN A CHECK AND ITS ASSIGNMENT REINTRODUCES THE
    // STAMPEDE, and nothing would fail visibly: the feature would still work,
    // just N times over. `verify-substack-refresh.mjs` fires ten callers before
    // the first settles and asserts they all receive the SAME promise object,
    // which is the check that would go red.

    // A run is already going and has not outstayed its welcome: join it.
    if (inFlight && t - inFlightAt < maxRunMs) return inFlight;

    // A run older than `maxRunMs` is presumed wedged. Drop the reference and
    // fall through rather than let one stuck fetch disable the feature forever.
    // The cost is that two runs may overlap, which is exactly what `applyPost`'s
    // P2002 re-read path in sync.js is built to survive.
    if (inFlight) inFlight = null;

    // `lastStartedAt` is stamped when a run STARTS, never when it finishes, so a
    // failing sync backs off for the whole interval instead of being retried by
    // every request that arrives while the feed is down.
    if (t - lastStartedAt < intervalMs) return null;

    lastStartedAt = t;
    inFlightAt = t;

    // `Promise.resolve().then(run)` so a `run` that throws SYNCHRONOUSLY becomes
    // a rejected promise rather than an exception out of `refresh()` — the
    // caller is a render frame and must never see one.
    //
    // The `.catch` is not optional: several callers may hold this promise, and a
    // single unhandled rejection takes the process down.
    const promise = Promise.resolve()
      .then(run)
      .catch(() => null)
      .finally(() => {
        if (inFlight === promise) inFlight = null;
      });

    inFlight = promise;

    return promise;
  };
}
