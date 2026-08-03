import { getPlayerToken } from "@/lib/realtime/useRoom";

import { EDGE_CASE_GAME_ID } from "../multiplayer";

/**
 * Change your own name or colour in the lobby.
 *
 * This is `POST /api/rooms/[code]/join` — join and rejoin are the same request,
 * and a token already seated keeps its slot while the core applies the new name
 * and colour (it refuses both once the room has left "lobby"). So a colour
 * swap is a seat edit, not a game action: it belongs to the player, not to the
 * board, and it must not burn a revision or touch `state`.
 *
 * The colour a player ENDS UP with is the server's answer, never this request.
 * `assignColor` hands out the first free colour when the requested one has just
 * been taken, so the snapshot that comes back is the truth and the UI renders
 * that rather than what it asked for. Two people tapping the same swatch in the
 * same instant is a race no interface can prevent; this is what makes it
 * harmless.
 *
 * @param {String} code - The room code
 * @param {Object} seat
 * @param {String} [seat.name] - Display name
 * @param {String} [seat.color] - "blue" | "purple" | "orange" | "green"
 * @returns {Promise<{ok: Boolean, room?: Object, error?: String, message?: String}>}
 */
export async function updateSeat(code, { name, color } = {}) {
  try {
    const response = await fetch(`/api/rooms/${encodeURIComponent(code)}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: getPlayerToken(),
        game: EDGE_CASE_GAME_ID,
        name,
        color,
      }),
    });

    let body = null;
    try {
      body = await response.json();
    } catch {
      // A proxy's HTML error page. `response.ok` still tells us what happened.
    }

    if (!response.ok) {
      return {
        ok: false,
        error: body?.error ?? "request-failed",
        message: body?.message,
      };
    }

    return { ok: true, room: body?.room ?? null };
  } catch {
    return { ok: false, error: "network" };
  }
}
