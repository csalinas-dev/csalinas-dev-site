/**
 * A turn's identity, by VALUE.
 *
 * Hotseat, a new turn is a new `game` object and `lastTurn === watched.current`
 * is a perfectly good "nothing new happened". Online it is not, and the
 * difference is invisible until two browsers are talking:
 *
 *   - every snapshot arrives as a fresh `JSON.parse`, so `game.lastTurn` is a
 *     new object every time even when nothing moved;
 *   - the SAME revision is re-delivered on purpose — presence does not bump the
 *     revision, so `subscribeRoom` re-publishes the identical payload whenever
 *     anybody's connection blinks, and `useRoom`'s `applyRoom` lets an equal
 *     revision through because that is how an optimistic preview is rolled back;
 *   - the polling fallback re-applies a snapshot every two seconds.
 *
 * So identity is not news, and anything keyed off it fires constantly: the board
 * would replay the last orbit every couple of seconds, and a half-staged turn
 * would be wiped out from under the player's finger.
 *
 * NEVER KEY A RENDER OFF THE IDENTITY OF ANYTHING THAT CAME OUT OF A ROOM.
 *
 * Two consecutive states cannot share a key: `by` alternates between the two
 * seats, and a rematch puts a `new:` state between the two games. The good
 * consequence is that an optimistic preview of a turn and the server's
 * confirmation of the SAME turn are one animation rather than two.
 *
 * @param {Object} game - An engine state
 * @returns {String} A key that changes exactly when the turn on the board does
 */
export const turnKey = (game) => {
  const last = game.lastTurn;
  if (!last) return `new:${game.turn}`;
  const move = last.move ? `${last.move.from}>${last.move.to}` : "-";

  return `${last.by}:${move}:${last.place}:${last.spins}`;
};
