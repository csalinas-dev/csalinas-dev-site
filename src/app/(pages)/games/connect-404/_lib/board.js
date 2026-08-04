/**
 * Connect 404 — board geometry.
 *
 * ┌───────────────────────────────────────────────────────────────────────────┐
 * │ COORDINATE CONVENTION — read this before rendering, hit-testing or        │
 * │ animating. Do not re-derive it; three renderers disagreeing about which   │
 * │ end of a column is the floor is three different bugs.                     │
 * └───────────────────────────────────────────────────────────────────────────┘
 *
 * ROW 0 IS THE BOTTOM. `col` grows RIGHTWARD, `row` grows UPWARD.
 *
 * The board is stored COLUMN-MAJOR as `state.columns`: one array per column,
 * holding only the pieces actually in it. `columns[c][0]` is the piece resting
 * on the floor of column c, and a new piece is PUSHED ON TOP. That is gravity,
 * expressed as `Array.prototype.push` — a column is always a contiguous stack
 * from the bottom, and a floating piece is unrepresentable rather than merely
 * illegal.
 *
 * A column's LENGTH is therefore both its height and the row a new piece would
 * land on, which is all `landingRow` is.
 *
 *          col  0   1   2   3   4   5   6
 *              ┌───┬───┬───┬───┬───┬───┬───┐
 *      row 5   │   │   │   │   │   │   │   │   ← TOP    (columns[c][5])
 *              ├───┼───┼───┼───┼───┼───┼───┤
 *      row 4   │   │   │   │   │   │   │   │
 *              ├───┼───┼───┼───┼───┼───┼───┤
 *      row 3   │   │   │   │   │   │   │   │
 *              ├───┼───┼───┼───┼───┼───┼───┤
 *      row 2   │   │   │ B │   │   │   │   │   columns[2] = [A, R, B]
 *              ├───┼───┼───┼───┼───┼───┼───┤              length 3
 *      row 1   │   │ R │ R │   │   │   │   │              landingRow = 3
 *              ├───┼───┼───┼───┼───┼───┼───┤
 *      row 0   │ R │ A │ A │   │   │   │   │   ← BOTTOM (columns[c][0])
 *              └───┴───┴───┴───┴───┴───┴───┘
 *                                 ▲
 *                                 └── columns[4] = [], landingRow = 0
 *
 * A CELL is the pair `[col, row]`, in that order — the same order `lastMove`
 * and every entry of `winningLine` use. `cellAt(state, col, row)` is the slot
 * occupying it, or null.
 *
 * Rendering top-down (which is how a board is drawn) means walking rows
 * DESCENDING: `for (let row = rows - 1; row >= 0; row -= 1)`. Do not flip the
 * stored data to make a render loop read nicer; flip the loop.
 *
 * Every helper below takes a `board`: any object carrying `cols`, `rows` and
 * `columns`. A game state is a valid board, so `landingRow(state, 3)` works
 * as-is.
 */

/** Whether `col` names a column this board actually has. */
export const isColumnInRange = ({ cols }, col) =>
  Number.isInteger(col) && col >= 0 && col < cols;

/** Whether `row` names a row this board actually has. */
export const isRowInRange = ({ rows }, row) =>
  Number.isInteger(row) && row >= 0 && row < rows;

/**
 * How many pieces are stacked in a column.
 * @param {Object} board - Anything with `columns`
 * @param {Number} col - Column index, 0…cols - 1
 * @returns {Number} 0…rows, and 0 for a column that does not exist
 */
export const columnHeight = ({ columns }, col) => columns[col]?.length ?? 0;

/**
 * Whether a column has no room left.
 * @param {Object} board - Anything with `rows` and `columns`
 * @param {Number} col - Column index, 0…cols - 1
 * @returns {Boolean} True when the column is full
 */
export const isColumnFull = (board, col) =>
  columnHeight(board, col) >= board.rows;

/**
 * The row a piece dropped into this column would come to rest on.
 *
 * This is what the hover preview and the drop animation both read, so it has
 * to agree exactly with where `dropPiece` actually puts the piece — it is the
 * same expression in both places, deliberately.
 *
 * @param {Object} board - Anything with `cols`, `rows` and `columns`
 * @param {Number} col - Column index, 0…cols - 1
 * @returns {Number|null} The landing row (0 = bottom), or null if the column
 *   is full or is not on this board
 */
export const landingRow = (board, col) => {
  if (!isColumnInRange(board, col)) return null;

  const height = columnHeight(board, col);

  return height < board.rows ? height : null;
};

/**
 * Who occupies a cell.
 * @param {Object} board - Anything with `cols`, `rows` and `columns`
 * @param {Number} col - Column index, 0…cols - 1
 * @param {Number} row - Row index, 0 = BOTTOM
 * @returns {String|Number|null} The slot resting there, or null when the cell
 *   is empty or off the board
 */
export const cellAt = (board, col, row) => {
  if (!isColumnInRange(board, col) || !isRowInRange(board, row)) return null;

  return board.columns[col][row] ?? null;
};

/** How many cells the board has in total. */
export const cellCount = ({ cols, rows }) => cols * rows;

/** How many pieces have been played — which is also how many moves were made. */
export const pieceCount = ({ columns }) =>
  columns.reduce((total, column) => total + column.length, 0);

/** Whether every cell is occupied. */
export const isBoardFull = (board) =>
  pieceCount(board) >= cellCount(board);

/**
 * The columns a piece can still be dropped into.
 * @param {Object} board - Anything with `cols`, `rows` and `columns`
 * @returns {Number[]} Column indices, left to right
 */
export const openColumns = (board) =>
  Array.from({ length: board.cols }, (unused, col) => col).filter(
    (col) => !isColumnFull(board, col)
  );
