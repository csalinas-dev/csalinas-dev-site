/**
 * Connect 404 — the game engine.
 *
 * "Four in a row. Nothing found."
 *
 * Classic Connect Four. This module is the single source of truth for the
 * rules: it is pure, synchronous and has no dependencies at all — not even
 * lodash — so the server and every client run the identical code over the
 * identical state and never disagree about whose turn it is or who won.
 * Keep it that way; it has to run anywhere a game state does.
 *
 * The state:
 *
 *   {
 *     cols: 7, rows: 6,
 *     columns,        // 7 column stacks, columns[c][0] is the BOTTOM
 *     slots,          // the two player slots, in join order — an ARRAY
 *     turn,           // slot
 *     lastMove,       // { col, row, slot } | null — row 0 is the bottom
 *     winner,         // slot | null
 *     winningLine,    // [[col, row], ...] | null — the cells to highlight
 *     draw,           // bool
 *     finished,       // bool — winner or draw
 *   }
 *
 * ROW 0 IS THE BOTTOM, `col` grows rightward and `row` grows upward. The full
 * coordinate convention every renderer and hit-test depends on is documented at
 * the top of `board.js`. Read it there; do not re-derive it.
 *
 * `slots` is an array, and everything that iterates players reads that array.
 * Room state round-trips through a MySQL JSON column and MySQL does not
 * preserve object key order, so a turn order taken from `Object.keys` of
 * anything would pass every local test and scramble only online games.
 *
 * A rejected move returns the state it was given, BY REFERENCE, alongside an
 * error — never a throw and never a fresh object, so `result.state === state`
 * is a valid "nothing happened, skip the render".
 */

export {
  CONNECT,
  COLS,
  DROP_PIECE,
  MAX_PLAYERS,
  MIN_PLAYERS,
  MoveError,
  ROWS,
} from "./constants";

export { createState, resetState } from "./createState";
export { dropPiece } from "./dropPiece";
export { getResult } from "./getResult";
export { reducer } from "./reducer";
export { findWinningLine } from "./winningLine";

export {
  cellAt,
  cellCount,
  columnHeight,
  isBoardFull,
  isColumnFull,
  isColumnInRange,
  isRowInRange,
  landingRow,
  openColumns,
  pieceCount,
} from "./board";
