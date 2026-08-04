/**
 * The two things that can happen to a Connect 404 game.
 *
 * Action creators rather than bare objects because an online room (#114) has to
 * translate the same intents onto the wire, and it should be translating one
 * named shape rather than guessing at object literals scattered through the
 * components.
 */

export const DROP_PIECE = "DROP PIECE";
export const NEW_GAME = "NEW GAME";

/**
 * Drop a piece into a column.
 *
 * @param {Number} col - 0-based column
 * @param {String|Number} slot - Who is dropping it. Passed explicitly rather
 *   than read off `state.turn` because online the server decides whose move
 *   this is, and the reducer must be able to refuse a slot that is not up.
 */
export const dropPiece = (col, slot) => ({ type: DROP_PIECE, col, slot });

/**
 * Start over.
 *
 * @param {Object} [options]
 * @param {String|Number} [options.first] - Who opens. Omit and the reducer
 *   works it out: the winner of the game just finished, or — after a draw — the
 *   player who did not open it.
 */
export const newGame = (options = {}) => ({ type: NEW_GAME, ...options });
