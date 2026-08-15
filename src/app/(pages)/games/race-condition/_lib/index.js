/**
 * Race Condition — the game engine.
 *
 * "Everything moves at once. Line up first."
 *
 * The site's Orbito: a two-player 4x4 abstract where every turn ends by
 * rotating the whole board one position, and a line of four only counts once it
 * has. This module is the single source of truth for the rules: it is pure,
 * synchronous and has no dependencies at all — not even lodash — so the server
 * and every client run the identical code over the identical state and never
 * disagree about whose turn it is or who won. Keep it that way; it has to run
 * anywhere a game state does.
 *
 * A turn, from the publisher's rulebook:
 *
 *   1. MOVE ONE OF YOUR OPPONENT'S MARBLES to an adjacent, empty square —
 *      orthogonally only, never diagonally. OPTIONAL, and impossible on turn one.
 *   2. PLACE ONE OF YOUR OWN MARBLES on any free square.
 *   3. PRESS THE ORBITO BUTTON, which shifts ALL marbles one position.
 *
 * ⚠ STEP 1 MOVES YOUR OPPONENT'S MARBLE, NOT YOUR OWN, and not "any marble".
 * "Once placed, you cannot move your own marbles anymore. Only your opponent
 * can!" This is the rule this game is most often misremembered as not having;
 * reaching for one of your own marbles is refused with `MoveError.OwnMarble`.
 *
 * All three steps are ONE action, `PLAY TURN`, applied by `playTurn`. That is
 * what structurally guarantees the rulebook's most emphatic sentence — "Only
 * after pressing the Orbito-button, a valid 4-in-a-row can be created. So never
 * during a player's turn!" — because no state exists in which a marble has
 * landed and the button has not. The reasoning, and why the five overtime
 * presses resolve inside the same call, is at the top of `playTurn.js`.
 *
 * The state:
 *
 *   {
 *     size: 4,
 *     cells,          // 16 squares, FLAT and ROW-MAJOR: index = row * 4 + col
 *     slots,          // the two player slots, in join order — an ARRAY
 *     turn,           // slot
 *     lastTurn,       // null, or {
 *                     //   by,                // slot
 *                     //   move,              // { from, to } | null if declined
 *                     //   place,             // cell index
 *                     //   cellsBeforeOrbit,  // board after step 2, pre-press
 *                     //   spins,             // presses applied: 1, or 2…6 on
 *                     //                      // the turn that filled the board
 *                     // }
 *     winner,         // slot | null
 *     winningLines,   // number[][] | null — every line completed at the
 *                     //   deciding press. On a simultaneous draw this holds
 *                     //   BOTH colours' lines; colour each by cells[line[0]].
 *     draw,           // bool
 *     drawReason,     // "simultaneous" | "exhausted" | null
 *     finished,       // bool — winner or draw
 *   }
 *
 * ROW 0 IS THE TOP, `col` grows rightward and `row` grows downward. The full
 * indexing and adjacency convention every renderer and hit-test depends on is
 * documented at the top of `board.js`, and the orbit's two tracks and their
 * direction at the top of `orbit.js`. READ THEM THERE; DO NOT RE-DERIVE THEM.
 * A renderer that turns the board the other way still plays a legal-looking
 * game, which is what makes that particular bug so expensive.
 *
 * MARBLES IN HAND ARE DERIVED, not stored — a marble that has been placed never
 * leaves the board, so `marblesInHand` is always exact. There is no reserve
 * count to keep in step. `MARBLES_PER_PLAYER * 2 === CELLS`, so the board fills
 * exactly as the last marble lands and no player ever runs out early.
 *
 * TIES ARE REPORTED AS TIES, never broken. Both colours completing a line on one
 * press is a draw, and so is a full board that survives all five overtime
 * presses; `getResult` returns `winner: null` with `draw: true` and a
 * `drawReason` for both.
 *
 * `slots` is an array, and everything that iterates players reads that array —
 * including `getResult().hands`. Room state round-trips through a MySQL JSON
 * column and MySQL does not preserve object key order, so a turn order taken
 * from `Object.keys` of anything would pass every local test and scramble only
 * online games.
 *
 * A rejected turn returns the state it was given, BY REFERENCE, alongside an
 * error — never a throw and never a fresh object, so `result.state === state` is
 * a valid "nothing happened, skip the render". `createState` is the exception
 * and does throw: a bad roster is a lobby bug, not a turn.
 *
 * Verified by `node .agent/scripts/verify-race-condition.mjs`, which re-derives
 * the orbit tracks and the ten lines, checks a full orbit cycle, cross-checks
 * the win scan against an independently written one, and self-plays a few
 * thousand games.
 */

export {
  CELLS,
  DrawReason,
  LINE_LENGTH,
  MARBLES_PER_PLAYER,
  MAX_PLAYERS,
  MIN_PLAYERS,
  MoveError,
  OVERTIME_SPINS,
  PLAY_TURN,
  SIZE,
} from "./constants";

export { createState, resetState } from "./createState";
export { getResult } from "./getResult";
export { canMove, legalMoves } from "./moves";
export { playTurn, reject } from "./playTurn";
export { reducer } from "./reducer";

export {
  INNER_TRACK,
  ORBIT_TO,
  OUTER_TRACK,
  TRACKS,
  orbit,
  unorbit,
} from "./orbit";

export { LINES, completedLines, linesFor } from "./lines";

export {
  areAdjacent,
  cellAt,
  cellCoords,
  cellIndex,
  emptyCells,
  isBoardFull,
  isCellInRange,
  isEmpty,
  marblesInHand,
  marblesOnBoard,
  neighbors,
} from "./board";
