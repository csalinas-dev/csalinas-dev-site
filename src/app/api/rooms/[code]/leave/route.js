import { toResponse } from "@/lib/realtime/errors";
import { clientIp, limitOr429, readJson } from "@/lib/realtime/http";
import { leaveRoom } from "@/lib/realtime/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = 60;

/**
 * POST /api/rooms/[code]/leave — `{ token, slot? }` -> `{ room }`
 *
 * Give up your seat, or — as the host, in the lobby only — take somebody
 * else's. Bumping the revision is the point: every other client is watching
 * this room, so removing a seat is how they find out somebody has gone.
 *
 * Sent by `navigator.sendBeacon` when a tab closes, so it must tolerate being
 * called with no one listening for the response.
 */
export async function POST(request, { params }) {
  try {
    const { code } = await params;

    const limited = limitOr429(`rooms-leave:${clientIp(request)}`, RATE_LIMIT);
    if (limited) return limited;

    const body = await readJson(request);
    const room = await leaveRoom(code, { token: body.token, slot: body.slot });

    return Response.json({ room }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return toResponse(err);
  }
}
