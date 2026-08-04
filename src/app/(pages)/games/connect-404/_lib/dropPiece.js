import { MoveError } from "./constants";
import { isBoardFull, isColumnFull, isColumnInRange, landingRow } from "./board";
import { findWinningLine } from "./winningLine";

const MESSAGES = {
  [MoveError.Finished]: "The game is already over.",
  [MoveError.UnknownSlot]: "You are not in this game.",
  [MoveError.NotYourTurn]: "It is not your turn.",
  [MoveError.OutOfRange]: "That column is not on this board.",
  [MoveError.ColumnFull]: "That column is full.",
  [MoveError.UnknownAction]: "Connect 404 does not know that action.",
};

// A rejected move leaves the state exactly as it was — SAME REFERENCE, so
// callers can `if (result.state === state)` and skip a re-render.
export const reject = (state, code) => ({
  state,
  error: { code, message: MESSAGES[code] },
});

// The next player in join order, wrapping. Reads the `slots` ARRAY; see the
// note in `createState`.
const nextTurn = ({ slots, turn }) =>
  slots[(slots.indexOf(turn) + 1) % slots.length];

/**
 * Drop a piece into a column.
 *
 * Gravity is the whole game: a player picks a column, never a cell, and the
 * piece lands on top of whatever is already there. `landingRow` reports that
 * row for the hover preview, and this uses the same function to place it, so
 * the ghost piece and the real one can never disagree.
 *
 * Pure and synchronous, so the server and every client can run it on the same
 * state and land on the same board.
 *
 * @param {Object} state - The current game state
 * @param {Number} col - The column to drop into, 0…cols - 1
 * @param {String|Number} slot - The player attempting the move
 * @returns {{state: Object, error?: {code: String, message: String}}} The next
 *   state, or the untouched state and a reason it was rejected
 */
export const dropPiece = (state, col, slot) => {
  const { columns, slots, turn } = state;

  if (state.finished) return reject(state, MoveError.Finished);
  if (!slots.includes(slot)) return reject(state, MoveError.UnknownSlot);
  if (slot !== turn) return reject(state, MoveError.NotYourTurn);
  if (!isColumnInRange(state, col)) return reject(state, MoveError.OutOfRange);
  if (isColumnFull(state, col)) return reject(state, MoveError.ColumnFull);

  const row = landingRow(state, col);

  // Only the one column changes; the other six arrays are shared, which keeps
  // a per-column memo in the renderer honest.
  const nextColumns = [...columns];
  nextColumns[col] = [...columns[col], slot];

  const board = { ...state, columns: nextColumns };

  // A win can only run through the piece that just landed, so that is the only
  // cell worth scanning from.
  const winningLine = findWinningLine(board, col, row);
  const winner = winningLine ? slot : null;

  // A full board with no line is a DRAW: a real, third outcome. It is not a
  // loss for whoever filled the last cell, and it is not a win for anybody.
  const draw = winner === null && isBoardFull(board);

  return {
    state: {
      ...board,
      // The mover stays on the clock once the game is over — there is no next
      // turn to hand out, and a finished board reads better naming the player
      // who ended it than the one who never got to reply.
      turn: winner !== null || draw ? slot : nextTurn(state),
      lastMove: { col, row, slot },
      winner,
      winningLine,
      draw,
      finished: winner !== null || draw,
    },
  };
};
