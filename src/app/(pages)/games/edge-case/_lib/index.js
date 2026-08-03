/**
 * Edge Case — the game engine.
 *
 * "Claim the edge. Close the case."
 *
 * Classic Dots and Boxes. This module is the single source of truth for the
 * rules: it is pure, synchronous and has no dependencies at all — not even
 * lodash — so the server and every client run the identical code over the
 * identical state and never disagree about whose turn it is or who owns a box.
 * Keep it that way; it has to run anywhere a game state does.
 *
 * The state:
 *
 *   {
 *     cols, rows,                     // BOXES; dots are (cols + 1) x (rows + 1)
 *     slots,                          // player slots in join order
 *     edges: { h: bool[], v: bool[] },// drawn edges, flat indexed
 *     owners: (slot|null)[],          // one per box, row-major
 *     turn: slot,
 *     scores: { [slot]: n },
 *     lastMove: { type, index, slot, claimed } | null,
 *     finished: bool,
 *   }
 *
 * `lastMove.type` is the ORIENTATION of the edge just drawn ("h" or "v") and
 * `lastMove.claimed` is the box indices it closed.
 *
 * The coordinate convention for `edges` and `owners` — which every renderer and
 * hit-test depends on — is documented in full at the top of `edges.js`. Read it
 * there; do not re-derive it.
 */

export {
  DEFAULT_GRID_SIZE,
  DRAW_EDGE,
  GRID_SIZES,
  MAX_PLAYERS,
  MIN_PLAYERS,
  MoveError,
  Orientation,
} from "./constants";

export { createState, resetState } from "./createState";
export { drawEdge } from "./drawEdge";
export { getResult } from "./getResult";
export { reducer } from "./reducer";

export {
  boxCoords,
  boxCount,
  boxEdges,
  boxIndex,
  edgeBoxes,
  edgeCoords,
  edgeCount,
  edgeIndex,
  edgeKey,
  horizontalEdgeCoords,
  horizontalEdgeCount,
  horizontalEdgeIndex,
  isBoxComplete,
  isEdgeInRange,
  orientationEdgeCount,
  parseEdgeKey,
  verticalEdgeCoords,
  verticalEdgeCount,
  verticalEdgeIndex,
} from "./edges";
