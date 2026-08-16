import { createState, playTurn as takeTurn, resetState } from "../../_lib";
import { NEW_GAME, PLAY_TURN } from "../actions";
import { newGame } from "./newGame";

export { newGame };

/**
 * The hotseat store.
 *
 * Thin on purpose: every rule lives in `_lib`, and this only decides which of
 * them to ask. An online room (#144) runs the same `_lib` on the server through
 * `_lib/reducer`, so a rule restated here would be a rule that could disagree
 * with itself.
 */
export const reducer = (state, action) => {
  switch (action.type) {
    case PLAY_TURN: {
      // The engine refuses an illegal slide, an occupied square, a slot that is
      // not up and a finished game, and hands back the state it was given — the
      // same reference — when it does. That identity check is the whole
      // rejection path: nothing here has to know which rules exist, only that
      // one of them said no.
      const { state: game } = takeTurn(
        state.game,
        { move: action.move, place: action.place },
        action.slot
      );

      return game === state.game ? state : { ...state, game };
    }

    case NEW_GAME:
      return {
        ...state,
        // `resetState` is where "the winner opens the next game" lives — and
        // where a draw falls back to join order. It is the engine's rule and
        // the server will apply the same one, so it is not restated here.
        game: action.first
          ? createState({ slots: state.game.slots, first: action.first })
          : resetState(state.game),
      };

    default:
      return state;
  }
};

export default reducer;
