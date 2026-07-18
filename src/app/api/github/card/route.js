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

// GitHub renders README images through its Camo proxy, never the viewer's
// browser — so there is no github.com Referer to match on, and Camo identifies
// itself with a "github-camo" User-Agent. Requiring the Camo UA *and* the
// secret key (which only our profile README carries) is the practical
// equivalent of "only serve this to my GitHub profile". A github.com Referer is
// also accepted for the rare direct-browser case.
function authorize(request) {
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
        // does; on success, cache long (data is already memoized 6h upstream).
        "Cache-Control": failed
          ? "public, max-age=120, s-maxage=120"
          : "public, max-age=1800, s-maxage=21600, stale-while-revalidate=86400",
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
