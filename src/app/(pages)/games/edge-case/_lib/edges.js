/**
 * Edge Case — board geometry.
 *
 * ┌───────────────────────────────────────────────────────────────────────────┐
 * │ COORDINATE CONVENTION — read this before rendering or hit-testing         │
 * └───────────────────────────────────────────────────────────────────────────┘
 *
 * A board is `cols` x `rows` BOXES, which means (cols + 1) x (rows + 1) DOTS.
 * Everything is row-major, zero-indexed, and measured from the top-left dot.
 * `row` always grows downward and `col` always grows rightward.
 *
 * Dots are never stored — they are implied by the box grid.
 *
 * A 2 x 2 box board (3 x 3 dots) numbered end to end:
 *
 *        ·──h0──·──h1──·          rows of horizontal edges: rows + 1
 *        │      │      │          edges per row:            cols
 *        v0     v1     v2
 *        │ box0 │ box1 │          rows of vertical edges:   rows
 *        ·──h2──·──h3──·          edges per row:            cols + 1
 *        │      │      │
 *        v3     v4     v5
 *        │ box2 │ box3 │
 *        ·──h4──·──h5──·
 *
 * HORIZONTAL edges ("h") join dot (row, col) to dot (row, col + 1).
 *   row ∈ [0, rows]      col ∈ [0, cols - 1]
 *   flat index = row * cols + col            length = cols * (rows + 1)
 *
 * VERTICAL edges ("v") join dot (row, col) to dot (row + 1, col).
 *   row ∈ [0, rows - 1]  col ∈ [0, cols]
 *   flat index = row * (cols + 1) + col      length = (cols + 1) * rows
 *
 * BOXES are indexed the same way as their top-left dot.
 *   row ∈ [0, rows - 1]  col ∈ [0, cols - 1]
 *   flat index = row * cols + col            length = cols * rows
 *
 * The four edges of box (row, col):
 *   top    = h(row,     col)      bottom = h(row + 1, col)
 *   left   = v(row,     col)      right  = v(row,     col + 1)
 *
 * An "edge id" throughout the engine is the pair `{ orientation, index }`,
 * where `orientation` is "h" or "v" — the same strings that key `state.edges`.
 *
 * Every helper below takes a `grid`: any object carrying `cols` and `rows`.
 * A game state is a valid grid, so `boxEdges(state, 3)` works as-is.
 */

import { Orientation } from "./constants";

const { Horizontal, Vertical } = Orientation;

/** @returns {Number} How many horizontal edges the board has. */
export const horizontalEdgeCount = ({ cols, rows }) => cols * (rows + 1);

/** @returns {Number} How many vertical edges the board has. */
export const verticalEdgeCount = ({ cols, rows }) => (cols + 1) * rows;

/** @returns {Number} How many edges the board has in total. */
export const edgeCount = (grid) =>
  horizontalEdgeCount(grid) + verticalEdgeCount(grid);

/** @returns {Number} How many boxes the board has. */
export const boxCount = ({ cols, rows }) => cols * rows;

/** @returns {Number} How many edges of the given orientation the board has. */
export const orientationEdgeCount = (grid, orientation) =>
  orientation === Horizontal
    ? horizontalEdgeCount(grid)
    : verticalEdgeCount(grid);

/**
 * Flat index of the horizontal edge starting at dot (row, col).
 * @param {Object} grid - Anything with `cols`
 * @param {Number} row - Dot row, 0…rows
 * @param {Number} col - Dot column, 0…cols - 1
 * @returns {Number} Index into `state.edges.h`
 */
export const horizontalEdgeIndex = ({ cols }, row, col) => row * cols + col;

/**
 * Flat index of the vertical edge starting at dot (row, col).
 * @param {Object} grid - Anything with `cols`
 * @param {Number} row - Dot row, 0…rows - 1
 * @param {Number} col - Dot column, 0…cols
 * @returns {Number} Index into `state.edges.v`
 */
export const verticalEdgeIndex = ({ cols }, row, col) =>
  row * (cols + 1) + col;

/** The (row, col) a horizontal edge index came from. */
export const horizontalEdgeCoords = ({ cols }, index) => ({
  row: Math.floor(index / cols),
  col: index % cols,
});

/** The (row, col) a vertical edge index came from. */
export const verticalEdgeCoords = ({ cols }, index) => ({
  row: Math.floor(index / (cols + 1)),
  col: index % (cols + 1),
});

/**
 * (row, col) → flat index, for either orientation.
 * @param {Object} grid - Anything with `cols` and `rows`
 * @param {String} orientation - "h" or "v"
 * @param {Number} row - Dot row
 * @param {Number} col - Dot column
 * @returns {Number} Index into `state.edges[orientation]`
 */
export const edgeIndex = (grid, orientation, row, col) =>
  orientation === Horizontal
    ? horizontalEdgeIndex(grid, row, col)
    : verticalEdgeIndex(grid, row, col);

/**
 * Flat index → (row, col), for either orientation.
 * @param {Object} grid - Anything with `cols` and `rows`
 * @param {String} orientation - "h" or "v"
 * @param {Number} index - Index into `state.edges[orientation]`
 * @returns {{row: Number, col: Number}} Dot the edge starts at
 */
export const edgeCoords = (grid, orientation, index) =>
  orientation === Horizontal
    ? horizontalEdgeCoords(grid, index)
    : verticalEdgeCoords(grid, index);

/** Whether an edge id points at an edge this board actually has. */
export const isEdgeInRange = (grid, orientation, index) =>
  Number.isInteger(index) &&
  index >= 0 &&
  index < orientationEdgeCount(grid, orientation);

/** Box (row, col) → flat index into `state.owners`. */
export const boxIndex = ({ cols }, row, col) => row * cols + col;

/** Flat index into `state.owners` → box (row, col). */
export const boxCoords = ({ cols }, index) => ({
  row: Math.floor(index / cols),
  col: index % cols,
});

/**
 * The four edges that bound a box, as edge ids.
 * @param {Object} grid - Anything with `cols` and `rows`
 * @param {Number} index - Box index, row-major
 * @returns {{top: Object, right: Object, bottom: Object, left: Object}} Edge ids
 */
export const boxEdges = (grid, index) => {
  const { row, col } = boxCoords(grid, index);

  return {
    top: { orientation: Horizontal, index: horizontalEdgeIndex(grid, row, col) },
    right: {
      orientation: Vertical,
      index: verticalEdgeIndex(grid, row, col + 1),
    },
    bottom: {
      orientation: Horizontal,
      index: horizontalEdgeIndex(grid, row + 1, col),
    },
    left: { orientation: Vertical, index: verticalEdgeIndex(grid, row, col) },
  };
};

/**
 * The boxes an edge borders — two of them, or one along the outer rim.
 * @param {Object} grid - Anything with `cols` and `rows`
 * @param {String} orientation - "h" or "v"
 * @param {Number} index - Index into `state.edges[orientation]`
 * @returns {Number[]} Box indices, row-major, top/left first
 */
export const edgeBoxes = (grid, orientation, index) => {
  const { cols, rows } = grid;
  const { row, col } = edgeCoords(grid, orientation, index);
  const boxes = [];

  if (orientation === Horizontal) {
    // The box above this edge, then the box below it.
    if (row > 0) boxes.push(boxIndex(grid, row - 1, col));
    if (row < rows) boxes.push(boxIndex(grid, row, col));
  } else {
    // The box left of this edge, then the box right of it.
    if (col > 0) boxes.push(boxIndex(grid, row, col - 1));
    if (col < cols) boxes.push(boxIndex(grid, row, col));
  }

  return boxes;
};

/**
 * Whether all four of a box's edges are drawn.
 * @param {Object} board - Anything with `cols`, `rows` and `edges`
 * @param {Number} index - Box index, row-major
 * @returns {Boolean} True when the box is closed
 */
export const isBoxComplete = (board, index) => {
  const { edges } = board;

  return Object.values(boxEdges(board, index)).every(
    (edge) => edges[edge.orientation][edge.index] === true
  );
};

/**
 * A stable string id for an edge — for React keys and DOM lookups, so every
 * component agrees on one format.
 * @param {String} orientation - "h" or "v"
 * @param {Number} index - Index into `state.edges[orientation]`
 * @returns {String} e.g. "h:12"
 */
export const edgeKey = (orientation, index) => `${orientation}:${index}`;

/** The edge id an `edgeKey` came from. */
export const parseEdgeKey = (key) => {
  const [orientation, index] = String(key).split(":");

  return { orientation, index: Number(index) };
};
