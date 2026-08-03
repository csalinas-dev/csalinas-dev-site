import { PRESENCE_STALE_MS } from "./constants";

// Who is actually watching a room right now.
//
// WHY THIS IS NOT IN THE DATABASE: a room dies an hour after its last accepted
// *action*, deliberately not its last connection — a tab left open overnight
// must not keep a dead game alive. Prisma's `@updatedAt` fires on every write,
// so recording a heartbeat on the row would reset that clock and rooms would
// never expire. Presence is also inherently ephemeral: it describes a live
// connection, not a fact about the game, and losing it on restart is correct
// (every client reconnects and re-announces within seconds).
//
// Single container, so a plain Map is the whole implementation.

/** @type {Map<string, Map<string, number>>} code -> token -> lastSeen ms */
const rooms = new Map();

/**
 * Note that `token` is alive in `code`. Called when a stream opens and on every
 * snapshot read, so a client on the polling fallback stays present too.
 */
export function markPresent(code, token) {
  if (!code || !token) return;
  const key = String(code).toUpperCase();
  let seen = rooms.get(key);
  if (!seen) {
    seen = new Map();
    rooms.set(key, seen);
  }
  seen.set(token, Date.now());
}

/** Note that a stream closed. Absence is immediate — no need to wait it out. */
export function markAbsent(code, token) {
  if (!code || !token) return;
  const key = String(code).toUpperCase();
  const seen = rooms.get(key);
  if (!seen) return;
  seen.delete(token);
  if (seen.size === 0) rooms.delete(key);
}

/**
 * The tokens currently present in a room, dropping any that have gone quiet.
 * Sweeping on read keeps this bounded without a timer.
 *
 * @returns {Set<string>}
 */
export function presentTokens(code) {
  const key = String(code ?? "").toUpperCase();
  const seen = rooms.get(key);
  if (!seen) return new Set();

  const cutoff = Date.now() - PRESENCE_STALE_MS;
  for (const [token, at] of seen) {
    if (at < cutoff) seen.delete(token);
  }
  if (seen.size === 0) {
    rooms.delete(key);
    return new Set();
  }
  return new Set(seen.keys());
}

/** Drop everything for a room that has gone away. */
export function forgetRoom(code) {
  rooms.delete(String(code ?? "").toUpperCase());
}
