// The engine already names the move action, because it is the one the shared
// realtime core will dispatch (#94). Reusing it means a local move and a
// networked move are literally the same object.
import { DRAW_EDGE } from "../_lib";

export { DRAW_EDGE };

export const NEW_GAME = "NEW GAME";
export const SET_SETUP_OPEN = "SET SETUP OPEN";

/**
 * Claim an edge for a slot.
 * @param {Object} edge - `{ orientation, index }`
 * @param {String|Number} slot - The player making the move
 */
export const drawEdge = (edge, slot) => ({
  type: DRAW_EDGE,
  edge,
  slot,
});

/**
 * Start over. Anything left out is inherited from the game in progress, so
 * "play again" and "switch to four players" are the same action.
 * @param {Object} [options]
 * @param {Number} [options.size] - Dots per side: 5, 7 or 9
 * @param {Number} [options.playerCount] - 2 to 4
 */
export const newGame = (options = {}) => ({
  type: NEW_GAME,
  ...options,
});

export const setSetupOpen = (open) => ({
  type: SET_SETUP_OPEN,
  open,
});
