/**
 * Race Condition — step 1 of a turn.
 *
 * The rulebook, verbatim and emphatically:
 *
 *   "1 — MOVE ONE OF YOUR OPPONENT'S MARBLES TO AN ADJACENT, EMPTY SQUARE.
 *    • This step is not possible during the first turn of the game (as there is
 *      no opponent's marble on the board yet) or if all positions adjacent to
 *      your opponent's marbles are occupied.
 *    • This step is optional. You can choose not to move an opponent's marble.
 *    • The marble can only be moved to an adjacent square and only horizontally
 *      or vertically, not diagonally."
 *
 *   "2 — PLACE ONE OF YOUR OWN MARBLES ONTO ANY FREE POSITION ON THE BOARD.
 *    Once placed, you cannot move your own marbles anymore. Only your opponent
 *    can!"
 *
 * YOU MOVE YOUR OPPONENT'S MARBLE, NEVER YOUR OWN. Reaching for one of your own
 * is the single most likely misreading of this game and is refused with its own
 * code, `MoveError.OwnMarble`, rather than being folded into a generic
 * "illegal move".
 *
 * `legalMoves` exists because the board (#143) stages a turn client-side before
 * committing it as one action, and needs to know what to highlight. It reads the
 * same `canMove` the engine enforces with, so a highlighted move can never be
 * refused.
 */

import { MoveError } from "./constants";
import { areAdjacent, cellAt, isCellInRange, isEmpty, neighbors } from "./board";

/**
 * Whether one player may slide the marble on `from` to `to`.
 *
 * @param {Object} state - The current game state
 * @param {Number} from - The square holding the marble to slide
 * @param {Number} to - The empty square to slide it onto
 * @param {String|Number} slot - The player taking the turn
 * @returns {String|null} A `MoveError` code, or null when the move is legal
 */
export const canMove = ({ cells }, from, to, slot) => {
  if (!isCellInRange(from) || !isCellInRange(to)) return MoveError.OutOfRange;

  const marble = cellAt(cells, from);

  // Nothing there to move — which is also what refuses every move on turn one,
  // when the board is empty.
  if (marble == null) return MoveError.EmptySource;
  // "Once placed, you cannot move your own marbles anymore. Only your opponent
  // can!"
  if (marble === slot) return MoveError.OwnMarble;
  if (!isEmpty(cells, to)) return MoveError.Occupied;
  // Orthogonal only. `areAdjacent` compares rows and columns rather than flat
  // indices, so the 3→4 wrap is not a move — see the note in `board.js`.
  if (!areAdjacent(from, to)) return MoveError.NotAdjacent;

  return null;
};

/**
 * The board a slide leaves behind — step 1 applied, nothing judged.
 *
 * `playTurn` runs this, and it is exported so #143's staged turn can show the
 * position it is about to commit and ask `emptyCells` where a marble may still
 * go, without restating step 1 in a component. It does NOT check legality:
 * callers offer moves from `legalMoves`, and `playTurn` runs `canMove` before it
 * gets here.
 *
 * @param {(String|Number|null)[]} cells - The board
 * @param {?{from: Number, to: Number}} move - The slide, or null to decline it
 * @returns {(String|Number|null)[]} A NEW board, or `cells` BY REFERENCE when the
 *   move is declined — the same "nothing happened" identity the rest of the
 *   engine uses.
 */
export const applyMove = (cells, move) => {
  if (move == null) return cells;

  const next = [...cells];
  next[move.to] = next[move.from];
  next[move.from] = null;

  return next;
};

/**
 * Every slide the player could make this turn.
 *
 * Returns `[]` on turn one for free — there is no opponent marble on the board
 * to walk out from — and `[]` again when every square beside every opponent
 * marble is occupied, which is exactly the two cases the rulebook calls out as
 * "not possible". Step 1 is optional regardless, so an empty list is never a
 * dead end.
 *
 * @param {Object} state - The current game state
 * @param {String|Number} slot - The player taking the turn
 * @returns {{from: Number, to: Number}[]} Legal slides, in board order
 */
export const legalMoves = (state, slot) => {
  const { cells } = state;
  const moves = [];

  cells.forEach((marble, from) => {
    if (marble == null || marble === slot) return;

    neighbors(from).forEach((to) => {
      if (canMove(state, from, to, slot) === null) moves.push({ from, to });
    });
  });

  return moves;
};
