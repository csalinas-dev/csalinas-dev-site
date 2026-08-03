import { ROOM_TTL_MS } from "./constants";
import { findPlayer, publicPlayer, publicPlayers } from "./players";
import { presentTokens } from "./presence";

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

  // Presence is live connection state, held in memory rather than on the row —
  // see presence.js for why it cannot be a database heartbeat. Stamped here so
  // every payload carries it and no caller has to remember to ask.
  const present = presentTokens(row.code);
  const players = publicPlayers(row.players).map((player, index) => ({
    ...player,
    connected: present.has(row.players?.[index]?.token),
  }));

  // Stamped here too, so `me` is the same shape as the seat with the same slot
  // in `players` — a UI that reads `connected` off one and not the other is a
  // bug waiting for whoever writes the next screen.
  const mine = findPlayer(row.players, token);

  return {
    code: row.code,
    game: row.game,
    status: row.status,
    revision: row.revision,
    state: row.state,
    players,
    me: mine
      ? { ...publicPlayer(mine), connected: present.has(mine.token) }
      : null,
    updatedAt: updatedAt.toISOString(),
    // Lets a UI warn before the room evaporates instead of discovering it on
    // the next move. Recomputed from `updatedAt` on every read, so it always
    // reflects the *last accepted action*, not when the client connected.
    expiresAt: new Date(updatedAt.getTime() + ROOM_TTL_MS).toISOString(),
  };
}
