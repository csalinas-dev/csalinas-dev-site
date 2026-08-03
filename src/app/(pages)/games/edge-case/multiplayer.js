import { defineGame } from "@/lib/realtime/games";

import {
  createState,
  DEFAULT_GRID_SIZE,
  drawEdge,
  DRAW_EDGE,
  GRID_SIZES,
  MAX_PLAYERS,
  MIN_PLAYERS,
  resetState,
} from "./_lib";
import { COLOR_CHOICES } from "./players";

/**
 * Edge Case, online — the rules the hotseat game already plays, in the shape
 * `src/lib/realtime` asks for.
 *
 * Named `multiplayer.js` rather than the `game.js` the core's README suggests,
 * because `Game.jsx` sits beside it and two modules whose names differ only in
 * case resolve to each other on Windows and macOS.
 *
 * PURE. This module is imported by the API routes (where it is the authority)
 * *and* by the browser (where `useRoom` runs it to preview a move), so it holds
 * no JSX, no `window`, no clock and no randomness. Not one rule is restated
 * here either: `drawEdge` below is the same `_lib` function the hotseat reducer
 * calls, so a local game and a networked one cannot drift.
 *
 * THE STATE
 * ---------
 *   {
 *     phase: "lobby" | "playing",
 *     size,           // dots per side, the host's choice, meaningful in both
 *     slots: [0, 1],  // seats in JOIN ORDER — an array, deliberately
 *     game: null | engineState,
 *   }
 *
 * `slots` is an array and not `Object.keys(scores)` because room state is a
 * MySQL JSON column and MySQL does not preserve object key order. Turn order is
 * the one thing in this game that would break silently and only in production.
 *
 * A room starts in `phase: "lobby"` with no board at all. That is what the
 * lobby needs — players arrive, pick colours and names, and the HOST decides
 * when everybody is here. There is no way to infer that moment, so nothing
 * tries to: `START` is an action, sent by seat 0.
 */

export const EDGE_CASE_GAME_ID = "edge-case";

/** Seat 0 created the room, and nobody ever vacates a seat, so seat 0 hosts. */
export const HOST_SLOT = 0;

export const SET_SIZE = "SET SIZE";
export const START = "START";
export const PLAY_AGAIN = "PLAY AGAIN";

export const setSize = (size) => ({ type: SET_SIZE, size });
export const start = () => ({ type: START });
export const playAgain = () => ({ type: PLAY_AGAIN });
export const drawEdgeAction = ({ orientation, index }) => ({
  type: DRAW_EDGE,
  orientation,
  index,
});

const isHost = (player) => player?.slot === HOST_SLOT;

export const edgeCase = defineGame({
  id: EDGE_CASE_GAME_ID,
  maxPlayers: MAX_PLAYERS,
  minPlayers: MIN_PLAYERS,
  // Offered in seat order and locked on claim by the core's `assignColor`: a
  // colour someone already holds is never handed out twice.
  colors: COLOR_CHOICES,
  // A dots-and-boxes board is a fixed number of boxes divided between a fixed
  // number of players. Adding a fifth hand halfway through is not a variant of
  // the game, it is a different game.
  allowLateJoin: false,

  createState: ({ options, players } = {}) => ({
    phase: "lobby",
    size: GRID_SIZES.includes(options?.size) ? options.size : DEFAULT_GRID_SIZE,
    slots: (players ?? []).map((player) => player.slot),
    game: null,
  }),

  /**
   * A seat was taken. The board does not exist yet — all that changes is the
   * running order, which is exactly what this hook is for.
   *
   * Never fires once play has started: `allowLateJoin` is false and the room's
   * status has left "lobby", so the core turns a newcomer away (and `useRoom`
   * quietly puts them in the spectator seat instead).
   */
  onPlayersChanged: (state, players) =>
    state.phase === "lobby"
      ? { ...state, slots: players.map((player) => player.slot) }
      : state,

  reducer: (state, action, player) => {
    switch (action?.type) {
      case SET_SIZE: {
        if (state.phase !== "lobby") {
          return { error: "The board is already set." };
        }
        if (!isHost(player)) return { error: "Only the host picks the board." };
        if (!GRID_SIZES.includes(action.size)) {
          return { error: "That is not a board size." };
        }
        return { state: { ...state, size: action.size } };
      }

      case START: {
        if (state.phase !== "lobby") return { error: "The game has started." };
        if (!isHost(player)) return { error: "Only the host can start." };
        if (state.slots.length < MIN_PLAYERS) {
          return { error: "Edge Case needs at least two players." };
        }

        return {
          state: {
            ...state,
            phase: "playing",
            // Join order becomes turn order, and the engine owns it from here.
            game: createState({ size: state.size, slots: state.slots }),
          },
        };
      }

      case DRAW_EDGE: {
        if (state.phase !== "playing") {
          return { error: "The game has not started yet." };
        }

        // The engine is the authority on every rule from here: whose turn it
        // is, whether the edge exists, who owns the box and who goes again.
        const { state: game, error } = drawEdge(state.game, action, player.slot);

        // A no-op write over the wire is worse than a 422 — it burns a revision
        // and tells the sender nothing — so a refusal is passed straight on.
        if (error) return { error: error.message };

        return { state: { ...state, game } };
      }

      case PLAY_AGAIN: {
        if (state.phase !== "playing" || !state.game?.finished) {
          return { error: "Finish this game before starting the next one." };
        }
        // Same board, same players, same order. Anyone at the table may ask for
        // it, so a rematch never waits on whoever just lost to press something.
        return { state: { ...state, game: resetState(state.game) } };
      }

      default:
        return { error: "That is not a move." };
    }
  },

  /**
   * Derived, never stored.
   *
   * "lobby" is what holds the door open while players arrive — the core refuses
   * a newcomer once this leaves "lobby", which is precisely the moment the host
   * presses Start. "over" then keeps a stranger with the code from wandering
   * into a finished board and taking a seat in it.
   */
  status: (state) => {
    if (state.phase !== "playing" || !state.game) return "lobby";
    return state.game.finished ? "over" : "playing";
  },
});

export default edgeCase;
