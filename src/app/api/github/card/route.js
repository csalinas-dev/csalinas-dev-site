import { getOverview, getStreak } from "@/lib/github/api";
import { profileCard } from "@/lib/github/svg";
import { rateLimit } from "@/lib/rate-limit";

// This handler inspects request headers (Camo / key gating), so it must run
// per-request rather than being statically cached. Upstream GitHub data is
// memoized separately in the data layer (6h), so this never hammers the PAT.
export const dynamic = "force-dynamic";

// Secret carried only by the csalinas-dev profile README's <img> URL. Because
// that README is public the key is not a true secret — anyone can read it — so
// it is one layer among several, not the whole defense. When unset (e.g. local
// dev) the key check is skipped and the Camo gate still applies.
const REQUIRED_KEY = process.env.GITHUB_CARD_KEY;

// Requests/minute/IP. Far below GitHub's ~5000/hr GraphQL budget; legitimate
// Camo traffic is tiny because the rendered image is itself cached.
const RATE_LIMIT = Number(process.env.GITHUB_CARD_RATE_LIMIT || 30);

function clientIp(request) {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

// The /github page on this site embeds the same card, so requests coming from
// our own pages are allowed without the key. Sec-Fetch-Site is the reliable
// signal here: browsers send it on image requests and scripts can't set it,
// while Referer depends on the visitor's referrer policy — so Referer is only a
// fallback for browsers that don't send Sec-Fetch-*.
function isSameOrigin(request) {
  const site = request.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";

  const host = request.headers.get("host");
  const referer = request.headers.get("referer");
  if (!host || !referer) return false;
  try {
    return new URL(referer).host === host;
  } catch {
    return false;
  }
}

// GitHub renders README images through its Camo proxy, never the viewer's
// browser — so there is no github.com Referer to match on, and Camo identifies
// itself with a "github-camo" User-Agent. Requiring the Camo UA *and* the
// secret key (which only our profile README carries) is the practical
// equivalent of "only serve this to my GitHub profile". A github.com Referer is
// also accepted for the rare direct-browser case.
function authorize(request) {
  // Our own site renders the card on /github — no key required there.
  if (isSameOrigin(request)) return null;

  if (REQUIRED_KEY) {
    const key = new URL(request.url).searchParams.get("key");
    if (key !== REQUIRED_KEY) return "bad or missing key";
  }

  const ua = (request.headers.get("user-agent") || "").toLowerCase();
  if (ua.includes("camo")) return null;

  try {
    const host = new URL(request.headers.get("referer") || "").hostname;
    if (host === "github.com" || host.endsWith(".github.com")) return null;
  } catch {
    // no / malformed referer
  }

  return "request must originate from GitHub";
}

export async function GET(request) {
  const denied = authorize(request);
  if (denied) return new Response(`forbidden: ${denied}`, { status: 403 });

  const limit = rateLimit(`github-card:${clientIp(request)}`, RATE_LIMIT);
  if (!limit.ok) {
    return new Response("too many requests", {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfter) },
    });
  }

  // Render each section independently: a failed GitHub call shows a small error
  // in that section instead of breaking the whole image (the card is our API —
  // it should always return a valid SVG; only the upstream data is at risk).
  const [overviewRes, streakRes] = await Promise.allSettled([
    getOverview(),
    getStreak(),
  ]);
  const overview = settle(overviewRes);
  const streak = settle(streakRes);
  const failed = overview.error || streak.error;

  try {
    return new Response(profileCard(overview, streak), {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        // On failure, cache only briefly so the card recovers as soon as GitHub
        // does; on success, cache 60s. GitHub's Camo proxy honors these headers
        // (subject to its own internal minimum), so a 60s window keeps the
        // streak/stats near-live. The data is memoized 60s upstream, so this is
        // the second and last cache in series.
        "Cache-Control": failed
          ? "public, max-age=60, s-maxage=60"
          : "public, max-age=60, s-maxage=60",
      },
    });
  } catch (err) {
    return new Response(`error: ${err.message}`, { status: 500 });
  }
}

// Unwrap an allSettled result into the section's data, or an { error } marker
// that the SVG renderer turns into an inline message.
function settle(result) {
  if (result.status === "fulfilled") return result.value;
  return { error: result.reason?.message || "unknown error" };
}
