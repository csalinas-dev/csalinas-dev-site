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
// A slot number is NOT enough to recognise the seat, because slots are
// recycled: `nextSlot` hands out the lowest free seat, so the newcomer who
// takes a freed lobby seat gets the number its previous occupant had. Matching
// on the number alone would re-seat the removed player as the newcomer — name,
// colour and all — and it would stick, because every following payload repeats
// the repair. So the seat is recognised by `connectedAt`, which is stamped once
// when a seat is created and never rewritten (`lastSeenAt` is the field that
// moves), and which `publicPlayer` puts on every seat of every payload,
// identity-less ones included.
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
 * @param {object} payload  a room payload, as it arrived
 * @param {object|null} heldSeat  the seat object this browser was last told it
 *   holds — the whole seat, not its slot, so it can be told apart from whoever
 *   occupies that slot next.
 * @returns {object} the payload, or a copy with `me` restored. Never mutates.
 */
export function keepSeat(payload, heldSeat) {
  // `me` already set is the normal case and the hot path: every payload of
  // every game goes through here, so it allocates nothing when it does nothing.
  if (!payload || payload.me) return payload;
  if (!heldSeat) return payload;

  const seat = payload.players?.find((player) => player.slot === heldSeat.slot);
  // Gone from the roster: the seat really is gone and `me: null` is the truth.
  if (!seat) return payload;

  // Still numbered the same, but is it still the same seat? A different
  // `connectedAt` means somebody else sat down in it after we got up, and this
  // payload is right that we hold nothing. Refuse, and let the removal land.
  //
  // When either side has no `connectedAt` there is nothing to compare, so this
  // degrades to matching on the slot alone — no worse than not looking.
  if (
    seat.connectedAt != null &&
    heldSeat.connectedAt != null &&
    seat.connectedAt !== heldSeat.connectedAt
  ) {
    return payload;
  }

  // Taken from this payload's own `players` rather than remembered, so name,
  // colour, `connected` and `left` stay as fresh as the rest of the snapshot.
  return { ...payload, me: seat };
}

export default keepSeat;
