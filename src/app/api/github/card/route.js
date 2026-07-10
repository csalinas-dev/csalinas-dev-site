import { getOverview, getStreak } from "@/lib/github/api";
import { profileCard } from "@/lib/github/svg";

export const revalidate = 21600; // 6h

export async function GET() {
  try {
    const [overview, streak] = await Promise.all([getOverview(), getStreak()]);
    return new Response(profileCard(overview, streak), {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control":
          "public, max-age=1800, s-maxage=21600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    return new Response(`error: ${err.message}`, { status: 500 });
  }
}
