import { toResponse } from "@/lib/realtime/errors";
import { clientIp, limitOr429, readJson } from "@/lib/realtime/http";
import { joinRoom } from "@/lib/realtime/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = 60;

/**
 * POST /api/rooms/[code]/join — `{ token, game?, name?, color? }` -> `{ room }`
 *
 * Join and rejoin are the same request. A token already seated in the room gets
 * its slot back untouched, which is what makes a refresh or a dropped tunnel a
 * non-event. `game` is optional but worth sending: it catches a mistyped code
 * that happens to belong to a different game with a clear 400 instead of
 * dropping somebody into a board they cannot read.
 */
export async function POST(request, { params }) {
  try {
    const { code } = await params;

    const limited = limitOr429(`rooms-join:${clientIp(request)}`, RATE_LIMIT);
    if (limited) return limited;

    const body = await readJson(request);
    const room = await joinRoom(code, {
      token: body.token,
      game: body.game,
      name: body.name,
      color: body.color,
    });

    return Response.json({ room });
  } catch (err) {
    return toResponse(err);
  }
}
