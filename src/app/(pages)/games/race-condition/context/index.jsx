"use client";

import { createContext, useMemo, useReducer } from "react";

import reducer from "./reducer";
// Aliased: `newGame` is also the name of the action creator this module
// re-exports, and they are different things — one builds a state, one asks for
// one.
import { newGame as freshGame } from "./reducer/newGame";

export const createDefaultState = () => freshGame();

/**
 * The five facts everything below this provider is allowed to know.
 *
 *   state     `{ game, players }` — the engine state and the cast
 *   dispatch  the same actions in both modes; online turns them into requests
 *   canPlay   MAY THIS DEVICE COMMIT A TURN RIGHT NOW. The only authority on it.
 *   canReset  may this device start the next game
 *   online    null when there is no room — the per-player view lives here
 *
 * THIS IS THE SEAM AND IT IS LOAD-BEARING. `canPlay` is the one place "may I
 * act" is decided, and `online?.youSlot` is the one source of which seat this
 * browser holds. Nothing below — `Game` least of all — may re-derive either from
 * `game.turn` when `online` is set: on one device they are the same player and
 * online they are usually not, and a board that works that out for itself is a
 * board #144 has to rewrite.
 */
export const Context = createContext({
  state: createDefaultState(),
  dispatch: () => {},
  canPlay: true,
  canReset: false,
  online: null,
});

/**
 * The local hotseat game — two players passing one device.
 *
 * Online play swaps this provider for one backed by a room and fills the
 * identical value shape, so everything below keeps working, because nothing
 * below knows where the state came from.
 */
export const ContextProvider = ({ children }) => {
  // Lazily built, but from constants only — the page is prerendered, so the
  // first client render has to produce exactly the markup the server did.
  const [state, dispatch] = useReducer(reducer, undefined, createDefaultState);

  const store = useMemo(
    () => ({
      state,
      dispatch,
      // Both players share the keyboard, so nothing but a finished game closes
      // the board.
      canPlay: !state.game.finished,
      // A restart is only offered once there is something to restart. After the
      // game is over it is the rematch, and the endgame panel owns it.
      canReset: state.game.lastTurn !== null || state.game.finished,
      online: null,
    }),
    [state, dispatch]
  );

  return <Context.Provider value={store}>{children}</Context.Provider>;
};

export * from "./actions";
