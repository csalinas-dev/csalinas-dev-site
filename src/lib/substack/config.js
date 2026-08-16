// Where the Substack feed lives.
//
// There is deliberately no default. A wrong-but-plausible default feed URL
// would sync somebody else's publication into this site's database and nothing
// would look broken until the posts appeared on /blog; an unset variable that
// throws is loud and immediate.

const ENV_KEY = "SUBSTACK_FEED_URL";

// The feed is fetched server-side by src/lib/substack/feed.js. https only: the
// response is parsed and its HTML is stored and later rendered into this site's
// own origin, so an on-path attacker rewriting it is a stored-XSS delivery
// mechanism, not a cosmetic problem.
export function getFeedUrl() {
  const raw = process.env[ENV_KEY];

  if (!raw || !raw.trim()) {
    throw new Error(`${ENV_KEY} is not set — cannot sync Substack posts.`);
  }

  let parsed;

  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new Error(`${ENV_KEY} is not a valid URL.`);
  }

  if (parsed.protocol !== "https:") {
    throw new Error(`${ENV_KEY} must be an https: URL (got ${parsed.protocol}).`);
  }

  return parsed.href;
}
