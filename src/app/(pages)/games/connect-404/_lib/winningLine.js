import { CONNECT } from "./constants";
import { cellAt } from "./board";

/**
 * Connect 404 — win detection.
 *
 * The reference repo (`csalinas-dev/connect4`) never got here; its README
 * still lists "determine if/when someone wins" as a TODO. So this is written
 * from scratch, and it is the part of the engine worth being paranoid about.
 *
 * Coordinates are `[col, row]` with ROW 0 AT THE BOTTOM — see `board.js`.
 *
 * FOUR AXES, not eight. A line and its reverse are the same line, so each axis
 * is stored once as a step `[dCol, dRow]` and walked in BOTH directions from
 * the piece that was just played:
 *
 *        ↖ (-1,+1)   ↑ (0,+1)   ↗ (+1,+1)
 *                  ╲    │    ╱
 *        ← (-1,0) ──── ● ──── → (+1,0)
 *                  ╱    │    ╲
 *        ↙ (-1,-1)   ↓ (0,-1)   ↘ (+1,-1)
 *
 *   [1, 0]   horizontal   — ← ●
 *   [0, 1]   vertical     — the stack the piece is sitting in
 *   [1, 1]   diagonal ↗   — up and to the right ("/" on screen)
 *   [1, -1]  diagonal ↘   — down and to the right ("\" on screen)
 *
 * Both diagonals. They are two distinct axes, and forgetting the second is the
 * classic Connect Four bug: every test you happen to write passes and the
 * board silently plays past a real win.
 */
const AXES = Object.freeze([
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
]);

/**
 * How far the same slot continues from a cell in one direction.
 * @param {Object} board - Anything with `cols`, `rows` and `columns`
 * @param {Number} col - Starting column (not counted)
 * @param {Number} row - Starting row (not counted)
 * @param {Number} dCol - Column step, -1 | 0 | 1
 * @param {Number} dRow - Row step, -1 | 0 | 1
 * @param {String|Number} slot - The slot to match
 * @returns {Number} How many consecutive matching cells lie that way
 */
const runLength = (board, col, row, dCol, dRow, slot) => {
  let count = 0;
  let c = col + dCol;
  let r = row + dRow;

  // `cellAt` returns null off the board, so the edge stops the walk on its own
  // and there is no separate bounds check to keep in step with this one.
  while (cellAt(board, c, r) === slot) {
    count += 1;
    c += dCol;
    r += dRow;
  }

  return count;
};

/**
 * The winning line through a cell, if there is one.
 *
 * Only ever called with the cell that was just played: a win cannot appear
 * anywhere a piece did not just land, so scanning all 42 cells after every
 * move would be forty-one wasted answers.
 *
 * A run longer than four is possible — filling the gap in `● ● _ ● ●` makes
 * five — and the whole run is returned, not an arbitrary four of it. A board
 * highlighting only four of five in a row looks like a bug because it is one.
 *
 * @param {Object} board - Anything with `cols`, `rows` and `columns`
 * @param {Number} col - Column of the cell to test
 * @param {Number} row - Row of the cell to test, 0 = BOTTOM
 * @returns {Array<[Number, Number]>|null} The cells of the run in board order
 *   — left to right, or bottom to top for a vertical — or null if no run of
 *   four passes through the cell
 */
export const findWinningLine = (board, col, row) => {
  const slot = cellAt(board, col, row);
  if (slot === null) return null;

  for (const [dCol, dRow] of AXES) {
    const before = runLength(board, col, row, -dCol, -dRow, slot);
    const after = runLength(board, col, row, dCol, dRow, slot);

    if (before + 1 + after < CONNECT) continue;

    // Walk from the far end of the run back along the axis, so the cells come
    // out in board order — left to right, and bottom to top for a vertical.
    const startCol = col - before * dCol;
    const startRow = row - before * dRow;

    return Array.from({ length: before + 1 + after }, (unused, step) => [
      startCol + step * dCol,
      startRow + step * dRow,
    ]);
  }

  return null;
};
