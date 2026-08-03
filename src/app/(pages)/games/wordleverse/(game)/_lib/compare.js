/**
 * Conflict resolution for the localStorage → database migration.
 *
 * A player can start the same day's puzzle on more than one device: signed out
 * on a phone (localStorage) and signed in on a laptop (database). When they
 * sign in on the phone, both copies of that date exist and one has to win.
 * Rather than letting the last device to sign in clobber the other, we keep the
 * better-performing game.
 */

// Ranking tiers, best first. A win always beats an unfinished game, which in
// turn beats a loss — an in-progress game can still be won, a lost one can't.
const WIN = 3;
const IN_PROGRESS = 2;
const LOSS = 1;

const isCompleted = (game) =>
  game.completed === true ||
  game.win === true ||
  game.win === false ||
  (game.row ?? 0) > 5;

const tier = (game) => {
  if (game.win === true) return WIN;
  return isCompleted(game) ? LOSS : IN_PROGRESS;
};

/**
 * How many guesses have actually been submitted. On a win `row` is the winning
 * row and is never incremented, so the count is one higher than the index.
 * @param {Object} game - A game state (localStorage shape or DB record)
 * @returns {Number} Guesses submitted
 */
export const guessesUsed = (game) =>
  game.win === true ? (game.row ?? 0) + 1 : game.row ?? 0;

/**
 * Whether `candidate` performed better than `existing` and should replace it.
 * Ties keep `existing` so migration never writes for no reason.
 * @param {Object} candidate - The incoming (localStorage) game
 * @param {Object} existing - The game already in the database
 * @returns {Boolean} True if the candidate should overwrite the existing game
 */
export const isBetterGame = (candidate, existing) => {
  if (!existing) return true;
  if (!candidate) return false;

  const candidateTier = tier(candidate);
  const existingTier = tier(existing);
  if (candidateTier !== existingTier) return candidateTier > existingTier;

  switch (candidateTier) {
    // Both won — solving in fewer guesses is the better game.
    case WIN:
      return guessesUsed(candidate) < guessesUsed(existing);
    // Neither is finished — keep whichever is further along so the player
    // doesn't lose progress by signing in.
    case IN_PROGRESS:
      return guessesUsed(candidate) > guessesUsed(existing);
    // Both lost. There is nothing to gain by swapping them.
    default:
      return false;
  }
};
