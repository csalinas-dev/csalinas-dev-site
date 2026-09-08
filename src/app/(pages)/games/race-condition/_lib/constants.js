/**
 * Race Condition — shared constants.
 *
 * "Everything moves at once. Line up first."
 */

// A 4x4 board, 16 cells, four in a row to win. A run of five cannot exist on a
// board this size, so unlike Connect 404 there is no partial-run logic anywhere.
export const SIZE = 4;
export const CELLS = SIZE * SIZE;
export const LINE_LENGTH = 4;

// Eight marbles each. `MARBLES_PER_PLAYER * 2 === CELLS` is the identity the
// whole endgame rests on: the board fills EXACTLY as the last marble is placed,
// so there is no "out of marbles" state to reach and no turn that has to be
// skipped. Change one of these numbers and the overtime rule stops meaning
// anything.
export const MARBLES_PER_PLAYER = 8;

// Orbito is strictly two-handed — two colours of marble, one board — so `slots`
// is always exactly this long.
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 2;

// The rulebook: "No player has a sequence of 4 after the last marble is placed
// onto the board and the Orbito-button has been pressed! In this case, the
// Orbito-button needs to be pressed 5 more times. The first player to get a
// sequence wins the game. If there is no sequence after 5 times, it's a draw!"
//
// Nobody chooses anything during those presses and no marble moves, so the
// outcome is fully determined the moment the sixteenth marble lands — the
// engine resolves all of them inside the same `playTurn` call. A full board's
// orbit has period 12, so it genuinely can cycle without ever producing a line;
// this cap is what stops the loop.
export const OVERTIME_SPINS = 5;

// Every reason a turn can be rejected. `playTurn` never throws for a bad turn —
// it returns the unchanged state (same reference) plus one of these.
export const MoveError = Object.freeze({
  Finished: "finished",
  UnknownSlot: "unknown-slot",
  NotYourTurn: "not-your-turn",
  BadTurn: "bad-turn",
  OutOfRange: "out-of-range",
  Occupied: "occupied",
  EmptySource: "empty-source",
  OwnMarble: "own-marble",
  NotAdjacent: "not-adjacent",
  UnknownAction: "unknown-action",
});

// The two ways a game ends with no winner. Both are real results and neither is
// ever broken into a win: "simultaneous" is both colours completing a line on
// the same press, "exhausted" is the board filling and all five overtime presses
// producing nothing.
export const DrawReason = Object.freeze({
  Simultaneous: "simultaneous",
  Exhausted: "exhausted",
});

// The action type the shared realtime core dispatches at `reducer`. A whole
// turn — move, place and the orbit that follows — is ONE action, deliberately:
// see the note at the top of `playTurn.js`.
export const PLAY_TURN = "PLAY TURN";
