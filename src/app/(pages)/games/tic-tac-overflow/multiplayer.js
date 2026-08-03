import { defineGame } from "@/lib/realtime/games";

import Mark from "./Mark";
import { createBoard } from "./context/reducer/helpers";
import { placeMark } from "./context/reducer/placeMark";

// The networked half of Tic-Tac-Overflow: the rules the hotseat game already
// plays, wrapped in the shape src/lib/realtime asks for.
//
// Named `multiplayer.js` rather than the `game.js` the core's README suggests
// because `Game.jsx` sits beside it, and two modules whose names differ only in
// case are one bundle away from resolving to each other on Windows and macOS.
//
// This module is pure on purpose. It is imported by the API routes (where it is
// the authority) *and* by the browser (where `useRoom` runs it to preview a
// move), so it must contain no JSX, no `window`, no clock and no randomness —
// the two copies have to agree exactly or the optimistic board drifts.
//
// The three-mark expiry is *called*, never restated: `placeMark` below is the
// same function the hotseat reducer dispatches to. Two implementations of that
// rule would drift silently, and it is the rule players would notice last.

export const TTO_GAME_ID = "tto";

// Which mark you are comes from your seat and never changes. Who *moves* first
// does — the winner opens the next game — so the two are tracked separately:
// the seat here, the clock in `state.turn`.
const MARKS = [Mark.X, Mark.O];

/** The mark belonging to a seat, or null for anyone who is only watching. */
export const markForSlot = (slot) => MARKS[slot] ?? null;

export const ticTacOverflow = defineGame({
  id: TTO_GAME_ID,
  maxPlayers: 2,
  minPlayers: 2,
  // Nothing to pick: a player's colour is their mark, and their mark is their
  // seat. An empty palette leaves `player.color` null, which is honest.
  colors: [],
  // Two seats, and a game with no draws has no natural moment to add a third.
  allowLateJoin: false,

  createState: () => createBoard(Mark.X),

  /**
   * The server's authority and the client's preview, in one function.
   *
   * `player` is resolved from the request's token by the core, so "it is not
   * your turn" is checked against a seat the client had no say in choosing.
   */
  reducer: (state, action, player) => {
    const mark = markForSlot(player.slot);
    if (mark === null) return { error: "You are not seated at this board." };

    switch (action?.type) {
      case "PLACE MARK": {
        const { cell } = action;

        // Everything `placeMark` would quietly ignore has to become an explicit
        // rejection here: the hotseat reducer returns its input unchanged for a
        // bad tap, but over the wire a no-op write is worse than a 422 — it
        // burns a revision and tells the sender nothing.
        if (!Number.isInteger(cell) || cell < 0 || cell > 8) {
          return { error: "That is not a cell on this board." };
        }
        if (state.winner !== null) {
          return { error: "That game is over — start the next one." };
        }
        if (state.turn !== mark) return { error: "It is not your turn." };
        if (state.board[cell] !== null) return { error: "That cell is taken." };

        return { state: placeMark(state, cell) };
      }

      case "PLAY AGAIN": {
        if (state.winner === null) {
          return { error: "Finish this game before starting the next one." };
        }
        // The winner opens the next board. Either player may ask for it, so a
        // rematch never waits on the one who just lost to press something.
        return { state: createBoard(state.winner) };
      }

      default:
        return { error: "That is not a move." };
    }
  },

  // Derived, never stored. "lobby" is what puts the waiting screen up until the
  // second player arrives; "over" is what stops a stranger with the code
  // wandering into a finished room and taking a seat.
  status: (state, players) => {
    if (players.length < 2) return "lobby";
    return state.winner === null ? "playing" : "over";
  },
});

export default ticTacOverflow;
