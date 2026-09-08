import { toResponse } from "@/lib/realtime/errors";
import { clientIp, limitOr429, readJson } from "@/lib/realtime/http";
import { switchGame } from "@/lib/realtime/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Changing the game is a decision, not a move — nobody makes one every second.
// Generous enough for a retried 409 and for everyone in a room sharing an IP.
const RATE_LIMIT = 30;

/**
 * POST /api/rooms/[code]/switch — `{ token, revision, to }` -> `{ room }`
 *
 * Rewrite which game this room is playing, keeping its code, its seats and
 * their names. The destination's own `createState` builds the new state, so
 * whether the room lands on a board or in a lobby is that game's business.
 *
 * `to` is the destination id, deliberately not named `game`: the other routes
 * take `game` as a "the room I think I am in" guard, and one key with two
 * meanings is how a switch ends up refused as `wrong-game`.
 *
 * `revision` is the version the client last rendered, so this sits in the same
 * compare-and-set scheme as an action — two people picking different games at
 * once cannot both win, and the loser gets 409 with the room attached.
 */
export async function POST(request, { params }) {
  try {
    const { code } = await params;

    const limited = limitOr429(`rooms-switch:${clientIp(request)}`, RATE_LIMIT);
    if (limited) return limited;

    const body = await readJson(request);
    const room = await switchGame(code, {
      token: body.token,
      revision: body.revision,
      to: body.to,
    });

    return Response.json({ room }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return toResponse(err);
  }
}
