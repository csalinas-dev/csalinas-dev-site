"use client";

import { createContext, useMemo, useReducer } from "react";

import { DEFAULT_GRID_SIZE, MIN_PLAYERS } from "../_lib";
import reducer from "./reducer";
// Aliased: `newGame` is also the name of the action creator this module
// re-exports, and they are different things — one builds a state, one asks for
// one.
import { newGame as freshGame } from "./reducer/newGame";

// A two-player game on a seven-dot (six-by-six box) board: big enough that the
// chain play the game is actually about shows up, small enough to finish.
export const createDefaultState = () =>
  freshGame({ size: DEFAULT_GRID_SIZE, playerCount: MIN_PLAYERS });

export const Context = createContext({
  state: createDefaultState(),
  dispatch: () => {},
  // Null means "this device is the whole game". `OnlineGame` fills it with the
  // per-player view of a room — which seat is yours, the code, the connection —
  // and that is the only thing below this provider that knows the difference.
  online: null,
});

/**
 * The local hotseat game — two to four players passing one device.
 *
 * Online play (`online/OnlineGame.jsx`) swaps this provider for one backed by a
 * room and fills the identical value shape — `{ state: { game, players, ... },
 * dispatch, online }` — so everything below keeps working, because nothing
 * below knows where the state came from. `online` is the only difference, and
 * `Game` reads exactly two facts off it: which slot this device plays, and
 * whether it may move.
 */
export const ContextProvider = ({ children }) => {
  // Lazily built, but from constants only — the page is prerendered, so the
  // first client render has to produce exactly the markup the server did.
  const [state, dispatch] = useReducer(reducer, undefined, createDefaultState);

  const store = useMemo(
    () => ({ state, dispatch, online: null }),
    [state, dispatch]
  );

  return <Context.Provider value={store}>{children}</Context.Provider>;
};

export * from "./actions";
