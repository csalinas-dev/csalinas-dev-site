// The one place that decides when `me: null` in a payload is believable, the
// way absence.js is the one place that decides how absence is worded.
//
// `me` is resolved per payload from whatever token that payload was fetched
// with, so a payload fetched with no token reports `me: null` for a player who
// is still very much sitting in the room. The roster cannot lie the same way:
// a seat that is really gone is gone from `players` too. So an identity-less
// payload may only take a seat away when that seat has also left the roster —
// which is exactly the two ways a seat can disappear, the host removing
// somebody and a player standing up in the lobby.
//
// This repairs `me` and nothing else. The rest of an identity-less payload is
// still authoritative — the board must keep moving — so this is deliberately
// not "ignore payloads that don't know who I am".
//
// Pure and dependency-free: useRoom imports it, so everything it touches ends
// up in the browser bundle.

/**
 * Restore the seat a payload forgot, if the payload's own roster still says the
 * player is sitting in it.
 *
 * @param {object} payload   a room payload, as it arrived
 * @param {number|null} heldSlot  the slot this browser was last told it holds
 * @returns {object} the payload, or a copy with `me` restored. Never mutates.
 */
export function keepSeat(payload, heldSlot) {
  // `me` already set is the normal case and the hot path: every payload of
  // every game goes through here, so it allocates nothing when it does nothing.
  if (!payload || payload.me) return payload;
  if (heldSlot === null || heldSlot === undefined) return payload;

  const seat = payload.players?.find((player) => player.slot === heldSlot);
  // Gone from the roster: the seat really is gone and `me: null` is the truth.
  if (!seat) return payload;

  // Taken from this payload's own `players` rather than remembered, so name,
  // colour, `connected` and `left` stay as fresh as the rest of the snapshot.
  //
  // In a lobby a freed slot can be taken by somebody else, so in principle this
  // could re-attach to a seat that is no longer yours. It is only reachable
  // through a transport with no identity, the consequence is cosmetic, and the
  // server authorizes by token — it would answer such a move with 403.
  return { ...payload, me: seat };
}

export default keepSeat;
