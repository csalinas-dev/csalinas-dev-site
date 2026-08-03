/**
 * Edge Case — turning engine coordinates into SVG coordinates.
 *
 * The engine's convention (dots, edges, boxes; see `_lib/edges.js`) is the only
 * source of truth for WHICH edge is which. This file is the only source of
 * truth for WHERE it is drawn. Nothing here knows a rule.
 *
 * Board units, not pixels: the SVG carries a `viewBox` and is stretched to
 * whatever the layout gives it, so one box is always exactly `CELL` units and
 * every size of board renders from the same numbers.
 */

import { boxCoords, edgeCoords, edgeIndex, Orientation } from "../_lib";

const { Horizontal } = Orientation;

/** One box, in board units. Everything else is a fraction of this. */
export const CELL = 100;

/** Breathing room around the rim so outer dots and strokes are not clipped. */
export const PADDING = 34;

export const DOT_RADIUS = 8;

/** The drawn edge, and the faint hint of one that is still up for grabs. */
export const EDGE_STROKE = 13;
export const GHOST_STROKE = 4;

/**
 * The invisible tap target over each edge — 50 x 50 units, a full quarter of a
 * box, against a 13-unit line. This is the whole ball game on a phone: a 2px
 * line is untappable, and the fix is a hit area far larger than the thing it
 * hits.
 *
 * 50 is not arbitrary. A hit rect is inset from its dots by `HIT / 2`, which is
 * exactly the point at which a horizontal target and the vertical target
 * sharing its dot stop overlapping — so no tap is ever ambiguous — and 50 is
 * the value that makes the resulting rect as large as it can be. Bigger in one
 * direction only shrinks it in the other.
 */
export const HIT = 50;
const INSET = HIT / 2;

/** The viewBox a board of this many boxes needs. */
export const viewBox = ({ cols, rows }) =>
  `0 0 ${cols * CELL + PADDING * 2} ${rows * CELL + PADDING * 2}`;

/** Dot (row, col) → SVG centre. */
export const dotX = (col) => PADDING + col * CELL;
export const dotY = (row) => PADDING + row * CELL;

/**
 * Everything needed to draw and hit-test one edge.
 *
 * @param {Object} grid - Anything with `cols` and `rows` (a game state will do)
 * @param {String} orientation - "h" or "v"
 * @param {Number} index - Index into `state.edges[orientation]`
 * @returns {Object} Line endpoints, the hit rect, and the dot it starts at
 */
export const edgeGeometry = (grid, orientation, index) => {
  const { row, col } = edgeCoords(grid, orientation, index);
  const x = dotX(col);
  const y = dotY(row);

  if (orientation === Horizontal) {
    return {
      row,
      col,
      x1: x,
      y1: y,
      x2: x + CELL,
      y2: y,
      hit: { x: x + INSET, y: y - HIT / 2, width: CELL - HIT, height: HIT },
    };
  }

  return {
    row,
    col,
    x1: x,
    y1: y,
    x2: x,
    y2: y + CELL,
    hit: { x: x - HIT / 2, y: y + INSET, width: HIT, height: CELL - HIT },
  };
};

/**
 * The rect a box fills.
 * @param {Object} grid - Anything with `cols` and `rows`
 * @param {Number} index - Box index, row-major
 * @returns {Object} `{ row, col, x, y, width, height, cx, cy }`
 */
export const boxGeometry = (grid, index) => {
  const { row, col } = boxCoords(grid, index);
  const x = dotX(col);
  const y = dotY(row);

  return {
    row,
    col,
    x,
    y,
    width: CELL,
    height: CELL,
    cx: x + CELL / 2,
    cy: y + CELL / 2,
  };
};

/**
 * The edge an arrow key should move focus to.
 *
 * Edges do not sit on a grid of their own — horizontals and verticals
 * interleave — so "up" from a horizontal edge is a vertical one. The rule is
 * simply "the nearest edge whose centre lies that way", resolved to the
 * upper/left candidate when two are equally near, which keeps the walk
 * predictable.
 *
 * @param {Object} grid - Anything with `cols` and `rows`
 * @param {String} orientation - "h" or "v"
 * @param {Number} index - Index into `state.edges[orientation]`
 * @param {String} key - An `event.key`: ArrowUp/Down/Left/Right
 * @returns {?Object} An edge id, or null when there is nothing that way
 */
export const neighborEdge = (grid, orientation, index, key) => {
  const { cols, rows } = grid;
  const { row, col } = edgeCoords(grid, orientation, index);
  // Both return an edge id — `{ orientation, index }` — or null when the
  // coordinates fall off the board.
  const h = (r, c) =>
    r >= 0 && r <= rows && c >= 0 && c < cols
      ? { orientation: Orientation.Horizontal, index: edgeIndex(grid, Orientation.Horizontal, r, c) }
      : null;
  const v = (r, c) =>
    r >= 0 && r < rows && c >= 0 && c <= cols
      ? { orientation: Orientation.Vertical, index: edgeIndex(grid, Orientation.Vertical, r, c) }
      : null;

  if (orientation === Horizontal) {
    // A horizontal edge spans dots (row, col) → (row, col + 1).
    switch (key) {
      case "ArrowLeft":
        return h(row, col - 1);
      case "ArrowRight":
        return h(row, col + 1);
      case "ArrowUp":
        return v(row - 1, col);
      case "ArrowDown":
        return v(row, col);
      default:
        return null;
    }
  }

  // A vertical edge spans dots (row, col) → (row + 1, col).
  switch (key) {
    case "ArrowUp":
      return v(row - 1, col);
    case "ArrowDown":
      return v(row + 1, col);
    case "ArrowLeft":
      return h(row, col - 1);
    case "ArrowRight":
      return h(row, col);
    default:
      return null;
  }
};

/** Human-readable position of an edge, for screen readers. */
export const describeEdge = (grid, orientation, index) => {
  const { row, col } = edgeCoords(grid, orientation, index);

  return orientation === Horizontal
    ? `horizontal edge, row ${row + 1}, column ${col + 1}`
    : `vertical edge, row ${row + 1}, column ${col + 1}`;
};

/** Human-readable position of a box, for screen readers. */
export const describeBox = (grid, index) => {
  const { row, col } = boxCoords(grid, index);

  return `box row ${row + 1}, column ${col + 1}`;
};
