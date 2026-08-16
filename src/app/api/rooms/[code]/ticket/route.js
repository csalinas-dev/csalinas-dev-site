import { badRequest, toResponse } from "@/lib/realtime/errors";
import { clientIp, limitOr429, readJson } from "@/lib/realtime/http";
import { getRoom } from "@/lib/realtime/rooms";
import { issueTicket } from "@/lib/realtime/tickets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One per stream open, and a stream lasts until the tab closes. A client
// minting more than this is reconnecting in a loop.
const RATE_LIMIT = 60;

/**
 * POST /api/rooms/[code]/ticket — `{ token }` -> `{ ticket }`
 *
 * Exchanges the long-lived player token for a single-use ticket that opens one
 * SSE stream. The token travels in a POST body; only the ticket reaches the
 * stream URL, so the credential that authorizes moves never lands in a proxy
 * log. See `src/lib/realtime/tickets.js`.
 *
 * Spectators have no token and need no ticket — they open the stream bare, so a
 * request that arrives here without one has nothing to exchange: the ticket it
 * would get back stands in for nobody and the stream now refuses it as
 * `bad-ticket`. Saying so here makes it a 400 the caller can read instead of a
 * 403 two requests later that looks like the room rejecting them.
 */
export async function POST(request, { params }) {
  try {
    const { code } = await params;

    const limited = limitOr429(`rooms-ticket:${clientIp(request)}`, RATE_LIMIT);
    if (limited) return limited;

    const body = await readJson(request);

    if (!body.token) {
      throw badRequest("Missing or malformed player token.", "bad-token");
    }

    // Resolve the room first: a ticket for a dead room should be an honest 410
    // now rather than a stream that opens and immediately says `gone`.
    const room = await getRoom(code, body.token);

    return Response.json(
      { ticket: issueTicket(room.code, body.token) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return toResponse(err);
  }
}
