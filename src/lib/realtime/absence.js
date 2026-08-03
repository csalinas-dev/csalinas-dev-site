// How a room talks about somebody who is not there.
//
// Every player in a payload carries two independent facts: `left` (they meant
// it — they gave up the seat, or the host removed them) and `connected` (a
// stream, a snapshot read, a join or a move has been heard from them inside
// PRESENCE_STALE_MS). They are different news and they deserve different
// sentences. One is final and the game around it will not resume; the other is
// almost always a phone that locked itself, and will fix itself in a moment.
//
// The wording lives here rather than in either game because it is the same
// wording in both, and because the easy mistake with this data is tonal —
// dressing a two-second blink up as a catastrophe.
//
// Client-safe and dependency-free: this is imported by components, so nothing
// server-only may ever be pulled in here.

/** They are gone on purpose. Nothing is coming back. */
export const LEFT = "left";

/** Nothing heard from them lately. Ordinary, and usually brief. */
export const AWAY = "away";

/**
 * Read a seat's absence off a room payload.
 *
 * `left` wins over `connected`: somebody who walked out is also, a moment
 * later, disconnected, and "left" is the useful half of that.
 *
 * @param {?Object} player - A player from `room.players`, or `room.me`
 * @returns {?String} LEFT, AWAY, or null when they are here and connected
 */
export const absenceOf = (player) => {
  if (!player) return null;
  if (player.left) return LEFT;
  if (player.connected === false) return AWAY;
  return null;
};

/** Is anybody at this table not here? Takes payload players, not board cast. */
export const anyAbsent = (players) => players.some((p) => absenceOf(p) !== null);

/**
 * The one or two words that sit beside a name in a roster, a scoreboard or a
 * set of standings — where the row itself is the subject and a whole sentence
 * would not fit.
 *
 * @param {?String} absence - LEFT, AWAY or null
 * @returns {?String}
 */
export const absenceTag = (absence) => {
  if (absence === LEFT) return "left";
  if (absence === AWAY) return "away";
  return null;
};

/**
 * The whole sentence, for the places with room for one — a banner over a board
 * that has stopped moving, and for screen readers, which get no help at all
 * from a colour or a faded row.
 *
 * @param {String} name - What to call them
 * @param {?String} absence - LEFT, AWAY or null
 * @returns {?String}
 */
export const absenceSentence = (name, absence) => {
  if (absence === LEFT) return `${name} left the game.`;
  if (absence === AWAY) return `${name} lost connection. They may be back.`;
  return null;
};
