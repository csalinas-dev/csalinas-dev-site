/**
 * Race Condition — a whole turn.
 *
 * A turn is ONE atomic action: slide an opponent's marble (optional), place one
 * of your own, then press the Orbito button. It is modelled as one call rather
 * than three because of the rulebook's most emphatic sentence:
 *
 *   "Only after pressing the Orbito-button, a valid 4-in-a-row can be created.
 *    So never during a player's turn!"
 *
 * With move/place/press folded into a single transition there is no
 * representable state in which a marble has landed and the button has not, so
 * "a line only counts after the press" is guaranteed by the shape of the state
 * rather than by remembering to check a phase flag. It also costs the realtime
 * core one revision per turn instead of two, and leaves no half-finished turn
 * stranded on the server when somebody's phone drops mid-turn. #143 stages the
 * slide and the placement client-side and commits them together; that is what
 * `legalMoves` and `canMove` are exported for.
 *
 * The five overtime presses resolve inside this same call, for the same reason:
 * nobody chooses anything during them and no marble moves, so the result is
 * fully determined the instant the sixteenth marble is placed. A separate SPIN
 * action would have to invent a turn-owner the rules never name, and online it
 * would let one disconnect freeze a game whose outcome was already decided.
 */

import { DrawReason, MoveError, OVERTIME_SPINS } from "./constants";
import { isBoardFull, isCellInRange, isEmpty } from "./board";
import { completedLines } from "./lines";
import { canMove } from "./moves";
import { orbit } from "./orbit";

const MESSAGES = {
  [MoveError.Finished]: "The game is already over.",
  [MoveError.UnknownSlot]: "You are not in this game.",
  [MoveError.NotYourTurn]: "It is not your turn.",
  [MoveError.BadTurn]: "That turn is not shaped like a turn.",
  [MoveError.OutOfRange]: "That square is not on this board.",
  [MoveError.Occupied]: "There is already a marble there.",
  [MoveError.EmptySource]: "There is no marble to move there.",
  [MoveError.OwnMarble]: "You can only move your opponent's marbles.",
  [MoveError.NotAdjacent]: "A marble can only slide one square, never diagonally.",
  [MoveError.UnknownAction]: "Race Condition does not know that action.",
};

// A rejected turn leaves the state exactly as it was — SAME REFERENCE, so
// callers can `if (result.state === state)` and skip a re-render.
export const reject = (state, code) => ({
  state,
  error: { code, message: MESSAGES[code] },
});

// The next player in join order, wrapping. Reads the `slots` ARRAY; see the note
// in `createState`.
const nextTurn = ({ slots, turn }) =>
  slots[(slots.indexOf(turn) + 1) % slots.length];

/**
 * How a press ended, or null if it settled nothing.
 *
 * "It is possible that after pressing the Orbito-button, a player creates a
 * sequence of 4 in their opponent's colour and makes their opponent win!" — so
 * the winner is read off the BOARD, never assumed to be the player who moved.
 *
 * "If, after pressing the Orbito-button, both players simultaneously have a
 * sequence of 4, it's also a draw!" — two colours on one press is a draw and is
 * never broken, and `winningLines` carries both colours' lines so a renderer can
 * show what happened. Colour each line by `cells[line[0]]`.
 */
const settle = (cells) => {
  const winningLines = completedLines(cells);

  if (winningLines.length === 0) return null;

  const owners = new Set(winningLines.map((line) => cells[line[0]]));

  if (owners.size > 1) {
    return {
      winner: null,
      winningLines,
      draw: true,
      drawReason: DrawReason.Simultaneous,
    };
  }

  return {
    winner: cells[winningLines[0][0]],
    winningLines,
    draw: false,
    drawReason: null,
  };
};

/**
 * Take a turn: slide, place, press.
 *
 * Pure and synchronous, so the server and every client can run it on the same
 * state and land on the same board.
 *
 * @param {Object} state - The current game state
 * @param {Object} turn - The turn to take
 * @param {{from: Number, to: Number}} [turn.move] - Step 1, the optional slide
 *   of ONE OF THE OPPONENT'S marbles onto an orthogonally adjacent empty square.
 *   Omit it (or pass null) to decline.
 * @param {Number} turn.place - Step 2, the square to place your own marble on.
 *   Judged against the board AFTER the slide, so the square the opponent's
 *   marble just vacated is fair game and `move.to` is not.
 * @param {String|Number} slot - The player taking the turn
 * @returns {{state: Object, error?: {code: String, message: String}}} The next
 *   state, or the untouched state and a reason it was rejected
 */
export const playTurn = (state, turn, slot) => {
  const { cells, slots } = state;

  if (state.finished) return reject(state, MoveError.Finished);
  if (!slots.includes(slot)) return reject(state, MoveError.UnknownSlot);
  if (slot !== state.turn) return reject(state, MoveError.NotYourTurn);
  if (turn === null || typeof turn !== "object") {
    return reject(state, MoveError.BadTurn);
  }

  const { move = null, place } = turn;

  if (move !== null && (typeof move !== "object" || Array.isArray(move))) {
    return reject(state, MoveError.BadTurn);
  }

  // Step 1 — the optional slide.
  let played = cells;

  if (move !== null) {
    const refusal = canMove(state, move.from, move.to, slot);

    if (refusal !== null) return reject(state, refusal);

    played = [...cells];
    played[move.to] = played[move.from];
    played[move.from] = null;
  }

  // Step 2 — the placement, judged against the board the slide left behind.
  if (!isCellInRange(place)) return reject(state, MoveError.OutOfRange);
  if (!isEmpty(played, place)) return reject(state, MoveError.Occupied);

  const cellsBeforeOrbit = played === cells ? [...cells] : played;
  cellsBeforeOrbit[place] = slot;

  // Step 3 — the button. `cellsBeforeOrbit` is kept on the state so a renderer
  // can show the position the player actually built and then walk it forward one
  // press at a time by calling `orbit` itself, `spins` times.
  let board = orbit(cellsBeforeOrbit);
  let spins = 1;
  let outcome = settle(board);

  // "No player has a sequence of 4 after the last marble is placed onto the
  // board and the Orbito-button has been pressed! In this case, the
  // Orbito-button needs to be pressed 5 more times. The first player to get a
  // sequence wins the game. If there is no sequence after 5 times, it's a draw!"
  //
  // Only ever reachable on the turn that fills the sixteenth square, which is
  // how a renderer knows from `spins > 1` that it is showing overtime.
  if (outcome === null && isBoardFull(board)) {
    for (let extra = 0; extra < OVERTIME_SPINS && outcome === null; extra += 1) {
      board = orbit(board);
      spins += 1;
      outcome = settle(board);
    }

    if (outcome === null) {
      outcome = {
        winner: null,
        winningLines: null,
        draw: true,
        drawReason: DrawReason.Exhausted,
      };
    }
  }

  const finished = outcome !== null;

  return {
    state: {
      ...state,
      cells: board,
      // The player who ended it stays on the clock once the game is over —
      // there is no next turn to hand out, and a finished board reads better
      // naming them than the opponent who never got to reply.
      turn: finished ? slot : nextTurn(state),
      lastTurn: {
        by: slot,
        move: move === null ? null : { from: move.from, to: move.to },
        place,
        cellsBeforeOrbit,
        spins,
      },
      winner: outcome?.winner ?? null,
      winningLines: outcome?.winningLines ?? null,
      draw: outcome?.draw ?? false,
      drawReason: outcome?.drawReason ?? null,
      finished,
    },
  };
};
