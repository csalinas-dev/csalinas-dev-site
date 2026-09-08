/**
 * Race Condition — the winning lines.
 *
 * Exactly ten of them on a 4x4 board: 4 rows, 4 columns, 2 diagonals, each
 * exactly LINE_LENGTH squares long. A run of five cannot exist here, so there is
 * none of the partial-run bookkeeping Connect 404 needs — a line is either
 * complete or it is not.
 *
 * Derived from the grid below rather than pasted in;
 * `.agent/scripts/verify-race-condition.mjs` asserts the derivation equals:
 *
 *     [0,1,2,3]  [4,5,6,7]  [8,9,10,11]  [12,13,14,15]
 *     [0,4,8,12] [1,5,9,13] [2,6,10,14]  [3,7,11,15]
 *     [0,5,10,15] [3,6,9,12]
 *
 * The scan is over the WHOLE board, every time. Connect 404 can scan outward
 * from the cell just played because that is the only cell that changed; here the
 * orbit moves all sixteen, so a line can appear anywhere on the board including
 * nowhere near the marble that was placed. Scanning from the placed cell would
 * silently miss most wins.
 */

import { SIZE } from "./constants";
import { cellAt, cellIndex } from "./board";

const buildLines = () => {
  const rows = [];
  const cols = [];
  const down = [];
  const up = [];

  for (let i = 0; i < SIZE; i += 1) {
    const row = [];
    const col = [];

    for (let j = 0; j < SIZE; j += 1) {
      row.push(cellIndex(i, j));
      col.push(cellIndex(j, i));
    }

    rows.push(row);
    cols.push(col);
    // Top-left to bottom-right, then top-right to bottom-left.
    down.push(cellIndex(i, i));
    up.push(cellIndex(i, SIZE - 1 - i));
  }

  return [...rows, ...cols, down, up].map(Object.freeze);
};

/** Every line four marbles of one colour can occupy. */
export const LINES = Object.freeze(buildLines());

/**
 * Every line currently held end to end by a single player.
 *
 * @param {(String|Number|null)[]} cells - The board
 * @returns {Number[][]} The completed lines, in `LINES` order. Usually empty;
 *   more than one at a time is ordinary, and lines belonging to BOTH players at
 *   once is the simultaneous draw. Read each line's owner off
 *   `cells[line[0]]` — this does not group them.
 */
export const completedLines = (cells) =>
  LINES.filter((line) => {
    const owner = cellAt(cells, line[0]);

    return owner != null && line.every((index) => cellAt(cells, index) === owner);
  });

/**
 * Every completed line belonging to one player.
 *
 * @param {(String|Number|null)[]} cells - The board
 * @param {String|Number} slot - The player
 * @returns {Number[][]} That player's completed lines
 */
export const linesFor = (cells, slot) =>
  completedLines(cells).filter((line) => cellAt(cells, line[0]) === slot);
