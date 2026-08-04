/**
 * Connect 404 — shared constants.
 *
 * "Four in a row. Nothing found."
 */

// A standard Connect Four board: 7 columns wide, 6 rows tall, 42 cells.
export const COLS = 7;
export const ROWS = 6;

// How many in a row wins. Named rather than inlined because the win scan reads
// it four times and an off-by-one there is invisible until someone wins early.
export const CONNECT = 4;

// Connect Four is strictly two-handed — gravity and a 7x6 board only divide
// two ways — so `slots` is always exactly this long.
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 2;

// Every reason a move can be rejected. `dropPiece` never throws for a bad
// move — it returns the unchanged state (same reference) plus one of these.
export const MoveError = Object.freeze({
  Finished: "finished",
  UnknownSlot: "unknown-slot",
  NotYourTurn: "not-your-turn",
  OutOfRange: "out-of-range",
  ColumnFull: "column-full",
  UnknownAction: "unknown-action",
});

// The action type the shared realtime core dispatches at `reducer`.
export const DROP_PIECE = "DROP PIECE";
