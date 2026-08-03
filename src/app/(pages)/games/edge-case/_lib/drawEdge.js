import { MoveError, Orientation } from "./constants";
import { edgeBoxes, isBoxComplete, isEdgeInRange } from "./edges";

const MESSAGES = {
  [MoveError.Finished]: "The game is already over.",
  [MoveError.UnknownSlot]: "You are not in this game.",
  [MoveError.NotYourTurn]: "It is not your turn.",
  [MoveError.BadOrientation]: "An edge is either horizontal or vertical.",
  [MoveError.OutOfRange]: "That edge is not on this board.",
  [MoveError.AlreadyDrawn]: "That edge is already drawn.",
  [MoveError.UnknownAction]: "Edge Case does not know that action.",
};

// A rejected move leaves the state exactly as it was — same reference, so
// callers can `if (result.state === state)` and skip a re-render.
export const reject = (state, code) => ({
  state,
  error: { code, message: MESSAGES[code] },
});

// The next player in join order, wrapping.
const nextTurn = ({ slots, turn }) =>
  slots[(slots.indexOf(turn) + 1) % slots.length];

/**
 * Draw an edge.
 *
 * The one rule everything else hangs off: completing a box claims it and the
 * mover goes AGAIN. A single edge can complete two boxes at once (the edge two
 * boxes share) — that claims both, and it is still exactly one extra turn, not
 * two.
 *
 * Pure and synchronous, so the server and every client can run it on the same
 * state and land on the same board.
 *
 * @param {Object} state - The current game state
 * @param {Object} move - The edge to draw
 * @param {String} move.orientation - "h" or "v"
 * @param {Number} move.index - Index into `state.edges[orientation]`
 * @param {String|Number} slot - The player attempting the move
 * @returns {{state: Object, error?: {code: String, message: String}}} The next
 *   state, or the untouched state and a reason it was rejected
 */
export const drawEdge = (state, move, slot) => {
  const { orientation, index } = move ?? {};
  const { cols, rows, edges, owners, scores, slots, turn } = state;

  if (state.finished) return reject(state, MoveError.Finished);
  if (!slots.includes(slot)) return reject(state, MoveError.UnknownSlot);
  if (slot !== turn) return reject(state, MoveError.NotYourTurn);

  if (
    orientation !== Orientation.Horizontal &&
    orientation !== Orientation.Vertical
  ) {
    return reject(state, MoveError.BadOrientation);
  }

  if (!isEdgeInRange(state, orientation, index)) {
    return reject(state, MoveError.OutOfRange);
  }

  if (edges[orientation][index]) return reject(state, MoveError.AlreadyDrawn);

  const next = {
    ...edges,
    [orientation]: [...edges[orientation]],
  };
  next[orientation][index] = true;

  // Only the one or two boxes this edge borders can have been closed by it.
  const board = { cols, rows, edges: next };
  const claimed = edgeBoxes(board, orientation, index).filter((box) =>
    isBoxComplete(board, box)
  );

  const nextOwners = [...owners];
  claimed.forEach((box) => {
    nextOwners[box] = slot;
  });

  // Every box closed means every edge drawn, and vice versa: an edge only ever
  // exists as part of a box.
  const finished = nextOwners.every((owner) => owner !== null);

  return {
    state: {
      ...state,
      edges: next,
      owners: nextOwners,
      // Closing a box — one or two, it makes no difference — buys exactly one
      // more turn. Otherwise play passes on in join order. The final mover
      // stays on the clock once the game is over.
      turn: claimed.length > 0 || finished ? slot : nextTurn(state),
      scores: { ...scores, [slot]: scores[slot] + claimed.length },
      lastMove: { type: orientation, index, slot, claimed },
      finished,
    },
  };
};
