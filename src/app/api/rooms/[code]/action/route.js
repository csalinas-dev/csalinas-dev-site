import { toResponse } from "@/lib/realtime/errors";
import { clientIp, limitOr429, readJson } from "@/lib/realtime/http";
import { applyAction } from "@/lib/realtime/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Four players sharing a home connection, plus retries after a 409. Well above
// anything a human can produce and well below anything that would hurt.
const RATE_LIMIT = 240;

/**
 * POST /api/rooms/[code]/action — `{ token, revision, action }` -> `{ room }`
 *
 * `revision` is the version the client last rendered. If the board has moved on
 * the response is 409 with the current room attached, so the client can
 * re-render and decide whether the action still makes sense. A 422 means the
 * game's reducer said no (not your turn, illegal move) and carries the
 * unchanged room for the same reason.
 *
 * Note there is no `slot` or `playerId` in the body. There cannot be: the token
 * decides which seat is acting, so a client cannot move on someone else's turn
 * by asking nicely.
 */
export async function POST(request, { params }) {
  try {
    const { code } = await params;

    const limited = limitOr429(`rooms-action:${clientIp(request)}`, RATE_LIMIT);
    if (limited) return limited;

    const body = await readJson(request);
    const room = await applyAction(code, {
      token: body.token,
      game: body.game,
      revision: body.revision,
      action: body.action,
    });

    return Response.json({ room });
  } catch (err) {
    return toResponse(err);
  }
}
