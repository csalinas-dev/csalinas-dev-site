import { ROOM_TTL_MS } from "./constants";
import { findPlayer, publicPlayer, publicPlayers } from "./players";

/**
 * The only shape that ever leaves the server. Rows go in, tokens do not come
 * out — `publicPlayer` is an allow-list, so this is airtight as long as nobody
 * serializes a raw `GameRoom` row somewhere else.
 *
 * `me` is the caller's own seat, resolved from the token they presented rather
 * than from anything they claimed. It is `null` for spectators and for anyone
 * who has not joined.
 *
 * @param {object} row   a GameRoom row (or the in-memory equivalent)
 * @param {string} [token] the caller's player token
 */
export function roomPayload(row, token) {
  const updatedAt = row.updatedAt ? new Date(row.updatedAt) : new Date();

  return {
    code: row.code,
    game: row.game,
    status: row.status,
    revision: row.revision,
    state: row.state,
    players: publicPlayers(row.players),
    me: publicPlayer(findPlayer(row.players, token)),
    updatedAt: updatedAt.toISOString(),
    // Lets a UI warn before the room evaporates instead of discovering it on
    // the next move. Recomputed from `updatedAt` on every read, so it always
    // reflects the *last accepted action*, not when the client connected.
    expiresAt: new Date(updatedAt.getTime() + ROOM_TTL_MS).toISOString(),
  };
}
