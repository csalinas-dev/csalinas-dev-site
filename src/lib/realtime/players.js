// Seat bookkeeping, and the one place a player's token is stripped.
//
// THE RULE: nothing outside this file may build a player object that leaves the
// process. `publicPlayer` is the only exit, `serialize.js` is its only caller,
// and rooms.js only ever returns what serialize.js produced. If you find
// yourself reaching for `room.players` in a route handler, you are about to
// hand somebody else's credential to a browser.

const MAX_NAME_LENGTH = 24;

/** Strip the token. The whole security model of this layer is this function. */
export function publicPlayer(player) {
  if (!player) return null;
  // Allow-list rather than `delete player.token`: a field added to the stored
  // shape later is invisible to clients until somebody adds it here on purpose.
  return {
    slot: player.slot,
    name: player.name,
    color: player.color ?? null,
    connectedAt: player.connectedAt ?? null,
    lastSeenAt: player.lastSeenAt ?? null,
    // Set when somebody leaves a game already in progress. The seat stays so
    // the board and turn order still make sense; this is what lets everyone
    // else be told they have gone.
    left: player.left === true,
  };
}

export function publicPlayers(players) {
  return toArray(players).map(publicPlayer);
}

export function toArray(players) {
  return Array.isArray(players) ? players : [];
}

/** Internal — the returned object still carries the token. Never serialize it. */
export function findPlayer(players, token) {
  if (!token) return null;
  return toArray(players).find((p) => p && p.token === token) ?? null;
}

/** Lowest unoccupied seat, so a player who left and rejoins lands where they were. */
export function nextSlot(players, maxPlayers) {
  const taken = new Set(toArray(players).map((p) => p.slot));
  for (let slot = 0; slot < maxPlayers; slot += 1) {
    if (!taken.has(slot)) return slot;
  }
  return null;
}

/**
 * Honour a colour request when nobody has claimed it, otherwise hand out the
 * first free one. Silently correcting beats erroring: two players tapping the
 * same swatch at the same instant is a race the UI cannot prevent, and the
 * snapshot they get back tells them the truth immediately.
 */
export function assignColor(players, palette, requested) {
  const taken = new Set(toArray(players).map((p) => p.color));
  if (requested && palette.includes(requested) && !taken.has(requested)) {
    return requested;
  }
  return palette.find((color) => !taken.has(color)) ?? null;
}

/** Trim to something that will fit on a scoreboard, or fall back to the seat. */
export function cleanName(name, slot) {
  if (typeof name !== "string") return `Player ${slot + 1}`;
  const trimmed = name.replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH);
  return trimmed || `Player ${slot + 1}`;
}

/** Bump one player's `lastSeenAt`, returning a new array (the row is immutable to callers). */
export function touchPlayer(players, token, at = new Date().toISOString()) {
  return toArray(players).map((p) =>
    p.token === token ? { ...p, lastSeenAt: at } : p,
  );
}
