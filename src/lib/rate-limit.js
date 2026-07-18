// Minimal in-memory fixed-window rate limiter.
//
// The site runs as a single Next.js instance (one Docker container), so a
// module-level map is sufficient — there is no second process to coordinate
// with. State resets on restart, which is fine for abuse mitigation (the
// point is to blunt bursts, not to bill anyone).

const buckets = new Map(); // key -> { count, resetAt }

// Guard against the map growing without bound under a flood of unique keys.
function sweep(now) {
  for (const [k, v] of buckets) {
    if (now >= v.resetAt) buckets.delete(k);
  }
}

/**
 * Record a hit against `key` and report whether it is within `limit` hits per
 * `windowMs`.
 *
 * @returns {{ ok: boolean, limit: number, remaining: number, retryAfter: number }}
 */
export function rateLimit(key, limit, windowMs = 60_000) {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;

  if (buckets.size > 5000) sweep(now);

  return {
    ok: bucket.count <= limit,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
  };
}
