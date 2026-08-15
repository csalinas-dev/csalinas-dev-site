/**
 * The two things that can happen to a Race Condition game.
 *
 * Action creators rather than bare objects because an online room (#144) has to
 * translate the same intents onto the wire, and it should be translating one
 * named shape rather than guessing at object literals scattered through the
 * components.
 */

import { PLAY_TURN } from "../_lib";

// Re-exported from the engine rather than restated: `_lib/reducer` switches on
// this exact string on the server, and two copies of it is one copy too many.
export { PLAY_TURN };

export const NEW_GAME = "NEW GAME";

/**
 * Take a whole turn — slide, place, press.
 *
 * One action, not three, because the engine has no state in which a marble has
 * landed and the Orbito button has not; see the note at the top of
 * `_lib/playTurn.js`. The board stages the slide client-side and commits it
 * together with the placement.
 *
 * @param {?{from: Number, to: Number}} move - Step 1, the optional slide of one
 *   of the OPPONENT's marbles. `null` declines it.
 * @param {Number} place - Step 2, the square to place your own marble on
 * @param {String|Number} slot - Who is taking the turn. Passed explicitly rather
 *   than read off `state.turn` because online the server decides whose move this
 *   is, and the reducer must be able to refuse a slot that is not up.
 */
export const playTurn = (move, place, slot) => ({
  type: PLAY_TURN,
  move: move ?? null,
  place,
  slot,
});

/**
 * Start over.
 *
 * @param {Object} [options]
 * @param {String|Number} [options.first] - Who opens. Omit and the reducer works
 *   it out through the engine: the winner of the game just finished, or — after
 *   a draw — join order.
 */
export const newGame = (options = {}) => ({ type: NEW_GAME, ...options });
