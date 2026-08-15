/**
 * Race Condition — board geometry.
 *
 * ┌───────────────────────────────────────────────────────────────────────────┐
 * │ INDEXING CONVENTION — read this before rendering, hit-testing or          │
 * │ animating. Do not re-derive it; a renderer that disagrees with the engine │
 * │ about which corner is the origin plays a mirrored game that still looks   │
 * │ legal.                                                                    │
 * └───────────────────────────────────────────────────────────────────────────┘
 *
 * A 4x4 board stored ROW-MAJOR as a FLAT 16-cell array.
 *
 *     index = row * 4 + col        ROW 0 IS THE TOP, COL 0 IS THE LEFT
 *     `row` grows DOWNWARD, `col` grows RIGHTWARD
 *
 *              col  0    1    2    3
 *                 ┌────┬────┬────┬────┐
 *          row 0  │  0 │  1 │  2 │  3 │   ← TOP
 *                 ├────┼────┼────┼────┤
 *          row 1  │  4 │  5 │  6 │  7 │
 *                 ├────┼────┼────┼────┤
 *          row 2  │  8 │  9 │ 10 │ 11 │
 *                 ├────┼────┼────┼────┤
 *          row 3  │ 12 │ 13 │ 14 │ 15 │   ← BOTTOM
 *                 └────┴────┴────┴────┘
 *
 * `state.cells[i]` is the slot whose marble sits on that square, or null. There
 * is no second representation of the board and there are no piece objects — a
 * marble is nothing but its owner's slot at an index.
 *
 * Marbles in hand are DERIVED, never stored: a marble that has been placed
 * never leaves the board (the orbit moves it, it does not remove it), so
 * `MARBLES_PER_PLAYER - marblesOnBoard(...)` is always exact and cannot drift
 * out of step with the board the way a stored counter would.
 *
 * ADJACENCY — for step 1 of a turn, "adjacent" means ORTHOGONAL ONLY:
 *
 *     index - 4   (the square above, when row > 0)
 *     index + 4   (the square below, when row < 3)
 *     index - 1   (the square left,  ONLY when both share a row)
 *     index + 1   (the square right, ONLY when both share a row)
 *
 * Never diagonal. And note the row-wrap trap the flat array sets: 3 and 4 are
 * `±1` apart as integers but sit at opposite ends of the board, so `areAdjacent`
 * compares rows rather than trusting the arithmetic. Same for 7↔8 and 11↔12.
 *
 * The ORBIT — how the whole board shifts at the end of every turn — is a
 * separate convention with its own diagram at the top of `orbit.js`.
 *
 * Every helper below takes either a bare `cells` array or a game state, since a
 * state carries `cells`; `cellAt(state.cells, 5)` and `cellAt(cells, 5)` are the
 * same call.
 */

import { CELLS, MARBLES_PER_PLAYER, SIZE } from "./constants";

/** The flat index of a square, from its row and column. */
export const cellIndex = (row, col) => row * SIZE + col;

/**
 * The row and column of a flat index.
 * @param {Number} index - 0…15
 * @returns {{row: Number, col: Number}} Row 0 is the TOP, col 0 the LEFT
 */
export const cellCoords = (index) => ({
  row: Math.floor(index / SIZE),
  col: index % SIZE,
});

/** Whether `index` names a square this board actually has. */
export const isCellInRange = (index) =>
  Number.isInteger(index) && index >= 0 && index < CELLS;

/**
 * Who occupies a square.
 * @param {(String|Number|null)[]} cells - The board
 * @param {Number} index - 0…15
 * @returns {String|Number|null} The slot whose marble sits there, or null when
 *   the square is empty or off the board
 */
export const cellAt = (cells, index) =>
  isCellInRange(index) ? cells[index] ?? null : null;

/** Whether a square is on the board and has no marble on it. */
export const isEmpty = (cells, index) =>
  isCellInRange(index) && cells[index] == null;

/**
 * The squares a marble could still be placed on.
 * @param {(String|Number|null)[]} cells - The board
 * @returns {Number[]} Indices, in board order
 */
export const emptyCells = (cells) =>
  cells.reduce((open, occupant, index) => {
    if (occupant == null) open.push(index);

    return open;
  }, []);

/** How many marbles a player has on the board. */
export const marblesOnBoard = (cells, slot) =>
  cells.reduce((total, occupant) => total + (occupant === slot ? 1 : 0), 0);

/**
 * How many marbles a player has left to place.
 *
 * Derived, not stored — see the note in the header. Marbles never leave the
 * board, so this can never disagree with what is actually on it.
 *
 * @param {Object} state - A game state (anything carrying `cells`)
 * @param {String|Number} slot - The player
 * @returns {Number} 0…MARBLES_PER_PLAYER
 */
export const marblesInHand = ({ cells }, slot) =>
  MARBLES_PER_PLAYER - marblesOnBoard(cells, slot);

/** Whether every square is occupied. */
export const isBoardFull = (cells) =>
  cells.every((occupant) => occupant != null);

/**
 * The squares orthogonally touching this one.
 *
 * The left/right neighbours are filtered by ROW, not by index arithmetic —
 * 3 + 1 is 4, which is the far side of the board, not a neighbour.
 *
 * @param {Number} index - 0…15
 * @returns {Number[]} Up to four indices, ascending; empty for an index off the
 *   board
 */
export const neighbors = (index) => {
  if (!isCellInRange(index)) return [];

  const { row, col } = cellCoords(index);
  const found = [];

  if (row > 0) found.push(index - SIZE);
  if (col > 0) found.push(index - 1);
  if (col < SIZE - 1) found.push(index + 1);
  if (row < SIZE - 1) found.push(index + SIZE);

  return found;
};

/**
 * Whether two squares touch orthogonally — the only kind of move step 1 allows.
 * Not diagonal, and not the row wrap (3↔4, 7↔8, 11↔12).
 */
export const areAdjacent = (a, b) => {
  if (!isCellInRange(a) || !isCellInRange(b)) return false;

  const from = cellCoords(a);
  const to = cellCoords(b);

  return Math.abs(from.row - to.row) + Math.abs(from.col - to.col) === 1;
};
