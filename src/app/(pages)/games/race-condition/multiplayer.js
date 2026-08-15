import { defineGame } from "@/lib/realtime/games";

import { createState, reducer as engineReducer, resetState } from "./_lib";
import { NEW_GAME } from "./context/actions";

// The networked half of Race Condition: the rules the engine already plays,
// wrapped in the shape src/lib/realtime asks for.
//
// Named `multiplayer.js` rather than the `game.js` the core's README suggests
// because `Game.jsx` sits beside it, and two modules whose names differ only in
// case resolve to each other on Windows and macOS — webpack calls that a real
// casing collision and refuses to build.
//
// This module is pure on purpose. It is imported by the API routes (where it is
// the authority) *and* by the browser (where `useRoom` runs it to preview a
// turn), so it must contain no JSX, no `window`, no clock and no randomness —
// the two copies have to agree exactly or the board visibly jumps back. The two
// modules it imports are pure for the same reason.
//
// Every rule below is *called*, never restated: `_lib`'s reducer is the same
// function the hotseat store dispatches to, so a slide, a placement and all six
// presses of an overtime turn are resolved by one implementation on both sides
// of the wire. `resetState` is the same "new game", and it is where "the winner
// opens the next one" lives. A second copy of "four in a row" would drift, and
// it is the rule players would notice last.

export const RC_GAME_ID = "race-condition";

// Both seats exist from the moment the room does, so the board can too. An
// ARRAY, in seat order, because it becomes the engine's turn order and MySQL
// does not preserve the key order of anything else stored in a room.
export const SEATS = Object.freeze([0, 1]);

/** The seat that opens the very first game of a room. */
export const FIRST_SEAT = SEATS[0];

// The engine reports a refusal as `{ code, message }` so a caller can branch on
// the code; the core wants the one sentence it will put in a 422 and a player
// will read. Flattening that is the whole reason this adapter exists — hand the
// object through and the browser renders "[object Object]".
const refusal = (error) =>
  (typeof error === "string" ? error : error?.message) ||
  "That move is not allowed.";

export const raceCondition = defineGame({
  id: RC_GAME_ID,
  maxPlayers: 2,
  minPlayers: 2,
  // Nothing to pick, so nothing to negotiate: cyan is whoever created the room
  // and gold is whoever joined it, which makes a colour a seat. An empty palette
  // leaves `player.color` null rather than storing a second answer that could
  // disagree with `players.js` — that module is the only one that says what a
  // seat looks like.
  colors: [],
  // Two seats, eight marbles each, and sixteen squares that divide exactly two
  // ways.
  allowLateJoin: false,

  // Deliberately ignores the roster it is handed: `_lib/createState` THROWS on
  // anything but exactly two unique slots, and a room is created with one player
  // in it. The seats are fixed and known before anybody joins, so the board is
  // built from those and the second one is filled the moment somebody does.
  createState: () => createState({ slots: [...SEATS], first: FIRST_SEAT }),

  /**
   * The server's authority and the client's preview, in one function.
   *
   * `player` is resolved from the request's token by the core, so "it is not
   * your turn" is checked against a seat the client had no say in choosing —
   * request bodies never name a slot. Everything but the rematch is handed
   * straight to the engine, which accepts either a slot or this player object.
   */
  reducer: (state, action, player) => {
    // The one action the engine has no opinion about: a new game is a room-level
    // event, not a turn. Either player may ask for it, so the next game never
    // waits on the one who just lost to press something — and `resetState` is
    // where "the winner opens the next game" lives, falling back to seat order
    // after a draw. Same function the hotseat store calls.
    if (action?.type === NEW_GAME) {
      if (!state.slots.includes(player.slot)) {
        return { error: "You are not seated at this board." };
      }
      if (!state.finished) {
        return { error: "Finish this game before starting the next one." };
      }
      return { state: resetState(state) };
    }

    const result = engineReducer(state, action, player);
    if (result.error) return { error: refusal(result.error) };
    return { state: result.state };
  },

  // Derived, never stored. "lobby" is what puts the waiting screen up until the
  // second player arrives; "over" is what stops a stranger with the code
  // wandering into a finished room and taking a seat.
  status: (state, players) => {
    if (players.length < SEATS.length) return "lobby";
    return state.finished ? "over" : "playing";
  },
});

export default raceCondition;
