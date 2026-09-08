import { CELLS } from "./constants";
import { marblesInHand, marblesOnBoard } from "./board";

/**
 * How the game stands, or how it ended.
 *
 * A DRAW IS REPORTED AS A DRAW, never broken. There are two of them here and
 * both are real outcomes rather than a failure to decide: both colours
 * completing a line on the same press (`drawReason: "simultaneous"`), and the
 * board filling with nothing found after all five overtime presses
 * (`drawReason: "exhausted"`). Read `draw` BEFORE reaching for `winner` —
 * `winner` is null in both cases, exactly as it is mid-game.
 *
 * The end fields are decided by `playTurn` at the press that settles the game
 * and stored on the state, because the online half persists that state and
 * everybody has to agree on it. This reads them back and adds the counts a
 * status line wants; it does not re-decide the game.
 *
 * @param {Object} state - A game state, finished or not
 * @returns {Object} winner, draw, drawReason, winningLines, finished, turn,
 *   placed, remaining, spins and hands
 */
export const getResult = (state) => {
  const { cells, draw, drawReason, finished, slots, turn, winner, winningLines } =
    state;
  const placed = slots.reduce(
    (total, slot) => total + marblesOnBoard(cells, slot),
    0
  );

  return {
    // Null while the game is live, and null on either kind of draw. `draw` is
    // the field to read in those cases.
    winner: winner ?? null,
    draw: draw === true,
    drawReason: drawReason ?? null,
    // Every line completed at the deciding press, in board order. On a
    // simultaneous draw this holds BOTH colours' lines — colour each one by
    // `cells[line[0]]`.
    winningLines: winningLines ?? null,
    finished: finished === true,
    // Whose turn it is; on a finished board, whoever ended it.
    turn,
    placed,
    remaining: CELLS - placed,
    // How many times the button was pressed on the last turn: 1 normally, and
    // 2…6 only on the turn that filled the board and ran into overtime.
    spins: state.lastTurn?.spins ?? 0,
    // An ARRAY, in `slots` order — never an object keyed by slot. Room state
    // round-trips through a MySQL JSON column and MySQL does not preserve
    // object key order; see the note in `createState`.
    hands: slots.map((slot) => ({
      slot,
      onBoard: marblesOnBoard(cells, slot),
      inHand: marblesInHand(state, slot),
    })),
  };
};
