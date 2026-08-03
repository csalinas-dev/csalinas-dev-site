/**
 * Edge Case — shared constants.
 *
 * "Claim the edge. Close the case."
 */

// Board sizes offered to players, measured in DOTS per side. The board is
// always square, so `size` dots means `size - 1` boxes per side.
export const GRID_SIZES = Object.freeze([5, 7, 9]);

export const DEFAULT_GRID_SIZE = 7;

// A game needs an opponent, and the lobby only has four colours to hand out.
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;

// The two edge orientations. These strings are also the keys of `state.edges`,
// so `state.edges[orientation]` is always the right array.
export const Orientation = Object.freeze({
  Horizontal: "h",
  Vertical: "v",
});

// Every reason a move can be rejected. `drawEdge` never throws for a bad move —
// it returns the unchanged state plus one of these codes.
export const MoveError = Object.freeze({
  Finished: "finished",
  UnknownSlot: "unknown-slot",
  NotYourTurn: "not-your-turn",
  BadOrientation: "bad-orientation",
  OutOfRange: "out-of-range",
  AlreadyDrawn: "already-drawn",
  UnknownAction: "unknown-action",
});

// The action type the shared realtime core dispatches at `reducer`.
export const DRAW_EDGE = "DRAW EDGE";
