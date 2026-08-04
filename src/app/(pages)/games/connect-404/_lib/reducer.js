import { DROP_PIECE, MoveError } from "./constants";
import { dropPiece, reject } from "./dropPiece";

/**
 * The player a dispatch came from, as a slot.
 *
 * The shared realtime core hands its reducers a `player` OBJECT (it resolves
 * the seat from the request's token), while the hotseat game has only a slot.
 * Both are accepted here so neither caller has to remember which it holds; the
 * engine itself only ever deals in slots.
 */
const slotOf = (player) =>
  player !== null && typeof player === "object" ? player.slot : player;

/**
 * The per-game reducer the shared realtime core dispatches into: it takes the
 * state, one action, and the player who sent it, and hands back the next state
 * or a reason it was refused. Nothing here touches the network — the core owns
 * transport, this owns the rules.
 *
 * @param {Object} state - The current game state
 * @param {Object} action - `{ type: "DROP PIECE", col }`
 * @param {String|Number|Object} player - The slot the action arrived from, or
 *   the core's player object carrying it
 * @returns {{state: Object, error?: {code: String, message: String}}} Next state
 */
export const reducer = (state, action, player) => {
  switch (action?.type) {
    case DROP_PIECE:
      return dropPiece(state, action.col, slotOf(player));
    default:
      return reject(state, MoveError.UnknownAction);
  }
};

export default reducer;
