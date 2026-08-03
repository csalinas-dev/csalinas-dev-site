import { toResponse } from "@/lib/realtime/errors";
import { clientIp, limitOr429 } from "@/lib/realtime/http";
import { getRoom } from "@/lib/realtime/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Generous: this is also the polling fallback (every 2s per client), so the
// budget has to cover a household of players behind one NAT address.
const RATE_LIMIT = 240;

/**
 * GET /api/rooms/[code] — the authoritative snapshot.
 *
 * The token is optional and only decides who `me` is; anyone with the code can
 * read the board, which is exactly what spectating (#89) needs.
 *
 * It travels in an `X-Player-Token` header, not the query string: this is also
 * the polling fallback, so it would otherwise write a credential into the proxy
 * access log every two seconds. `fetch` can set headers — only the SSE stream,
 * which cannot, needs the ticket dance in `tickets.js`.
 */
export async function GET(request, { params }) {
  try {
    const { code } = await params;

    const limited = limitOr429(`rooms-read:${clientIp(request)}`, RATE_LIMIT);
    if (limited) return limited;

    const token = request.headers.get("x-player-token") || undefined;
    const room = await getRoom(code, token);

    return Response.json(
      { room },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return toResponse(err);
  }
}
