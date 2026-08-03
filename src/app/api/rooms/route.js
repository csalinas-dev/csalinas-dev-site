import { toResponse } from "@/lib/realtime/errors";
import { clientIp, limitOr429, readJson } from "@/lib/realtime/http";
import { createRoom } from "@/lib/realtime/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Creating a room is the only endpoint that writes a new row per request, so
// it is the one worth throttling hard. Everything else operates on a room that
// already exists and is bounded by the game's own rules.
const RATE_LIMIT = Number(process.env.GAME_ROOM_RATE_LIMIT || 10);

/** POST /api/rooms — `{ game, token?, name?, color? }` -> `{ code, slot, token, room }` */
export async function POST(request) {
  try {
    const limited = limitOr429(`rooms-create:${clientIp(request)}`, RATE_LIMIT);
    if (limited) return limited;

    const body = await readJson(request);
    const { room, token } = await createRoom({
      game: body.game,
      token: body.token,
      name: body.name,
      color: body.color,
      options: body.options,
    });

    // `code` and `slot` are the documented minimum; the full snapshot rides
    // along so the creator can render the lobby without a second round trip.
    return Response.json(
      { code: room.code, slot: room.me?.slot ?? null, token, room },
      { status: 201 },
    );
  } catch (err) {
    return toResponse(err);
  }
}
