import { DRAW_EDGE, MoveError } from "./constants";
import { drawEdge, reject } from "./drawEdge";

/**
 * The per-game reducer the shared realtime core dispatches into: it takes the
 * state, one action, and the player who sent it, and hands back the next state
 * or a reason it was refused. Nothing here touches the network — the core owns
 * transport, this owns the rules.
 *
 * @param {Object} state - The current game state
 * @param {Object} action - `{ type: "DRAW EDGE", orientation, index }`
 * @param {String|Number} player - The slot the action arrived from
 * @returns {{state: Object, error?: {code: String, message: String}}} Next state
 */
export const reducer = (state, action, player) => {
  switch (action?.type) {
    case DRAW_EDGE:
      return drawEdge(state, action, player);
    default:
      return reject(state, MoveError.UnknownAction);
  }
};

export default reducer;
