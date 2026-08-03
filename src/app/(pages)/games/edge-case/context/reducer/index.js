import { DRAW_EDGE, NEW_GAME, SET_SETUP_OPEN } from "../actions";
import { drawEdge } from "./drawEdge";
import { newGame } from "./newGame";

/**
 * The local (hotseat) wrapper around the engine.
 *
 * The wrapper state is deliberately thin:
 *
 *   { game, players, size, playerCount, setupOpen }
 *
 * `game` is an engine state and nothing else writes to it. Everything beside it
 * is presentation — who is what colour, what the size control is set to, whether
 * the setup panel is open. A networked room (#94) replaces this file wholesale
 * and keeps the same `game`/`players` shape, so the board and the scoreboard
 * carry over untouched.
 */
export const reducer = (state, action) => {
  switch (action.type) {
    case DRAW_EDGE:
      return drawEdge(state, action.edge, action.slot);
    case NEW_GAME:
      // Anything the action leaves out is inherited, so "play again" is just a
      // new game with no options at all. The setup panel stays as it was —
      // picking a size and then a player count is one thought, and the panel
      // slamming shut between them is not.
      return {
        ...newGame({
          size: action.size ?? state.size,
          playerCount: action.playerCount ?? state.playerCount,
        }),
        setupOpen: state.setupOpen,
      };
    case SET_SETUP_OPEN:
      return { ...state, setupOpen: action.open };
    default:
      return state;
  }
};

export default reducer;
