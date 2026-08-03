import { drawEdge as applyMove } from "../../_lib";

/**
 * Hand a move to the engine and keep whatever comes back.
 *
 * Not one rule lives here. The engine decides whether the move is legal, who
 * owns what, whether the mover goes again and whether the game is over — the
 * same code the server and every other client will run, so a local game and a
 * networked one can never drift apart.
 *
 * A rejected move comes back as the SAME state object by reference, which is
 * the engine's contract; returning the unchanged wrapper on that path means
 * React skips the render entirely.
 *
 * @param {Object} state - The local wrapper state
 * @param {Object} edge - `{ orientation, index }`
 * @param {String|Number} slot - The player making the move
 * @returns {Object} The next wrapper state
 */
export const drawEdge = (state, edge, slot) => {
  const { state: game } = applyMove(state.game, edge, slot);

  if (game === state.game) return state;

  return { ...state, game };
};
