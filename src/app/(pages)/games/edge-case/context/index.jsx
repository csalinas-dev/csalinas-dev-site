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
});

/**
 * The local hotseat game — two to four players passing one device.
 *
 * This is the seam for #94: online play swaps this provider for one backed by a
 * room, and everything below it keeps working, because nothing below it knows
 * where the state came from. The contract is the value shape — `{ state:
 * { game, players, ... }, dispatch }` — plus the two facts `Game` reads off it
 * to drive the board: which slot this device plays, and whether it may move.
 */
export const ContextProvider = ({ children }) => {
  // Lazily built, but from constants only — the page is prerendered, so the
  // first client render has to produce exactly the markup the server did.
  const [state, dispatch] = useReducer(reducer, undefined, createDefaultState);

  const store = useMemo(() => ({ state, dispatch }), [state, dispatch]);

  return <Context.Provider value={store}>{children}</Context.Provider>;
};

export * from "./actions";
