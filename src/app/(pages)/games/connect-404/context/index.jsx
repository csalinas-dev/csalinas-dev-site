"use client";

import { createContext, useEffect, useMemo, useReducer, useState } from "react";

import { readPieceInitials } from "@/lib/pieceInitials";

import reducer from "./reducer";
// Aliased: `newGame` is also the name of the action creator this module
// re-exports, and they are different things — one builds a state, one asks for
// one.
import { newGame as freshGame } from "./reducer/newGame";

export const createDefaultState = () => freshGame();

export const Context = createContext({
  state: createDefaultState(),
  dispatch: () => {},
  // A per-player DISPLAY preference, and nothing more: it stamps this browser's
  // pieces with their player's initial. It rides here rather than through
  // `dispatch` on purpose — online, `dispatch` IS the wire, and a preference
  // that has to be remembered *not* to send is a preference that will one day be
  // sent. Two plain keys on the context value cannot reach room state, cannot
  // move the revision, and cannot change what the other player sees.
  showInitials: false,
  setShowInitials: () => {},
  // Null means "this device is the whole game". An online room (#114) fills it
  // with the per-player view — which seat is yours, the code, the connection —
  // and that is the only thing below this provider that knows the difference.
  online: null,
});

/**
 * The local hotseat game — two players passing one device.
 *
 * Online play swaps this provider for one backed by a room and fills the
 * identical value shape — `{ state: { game, players, first }, dispatch, online }`
 * — so everything below keeps working, because nothing below knows where the
 * state came from. `online` is the only difference, and `Game` reads exactly two
 * facts off it: which slot this device plays, and whether it may move.
 */
export const ContextProvider = ({ children }) => {
  // Lazily built, but from constants only — the page is prerendered, so the
  // first client render has to produce exactly the markup the server did.
  const [state, dispatch] = useReducer(reducer, undefined, createDefaultState);

  const [showInitials, setShowInitials] = useState(false);

  // The stored preference can't seed the initial state, for the same reason the
  // board can't: the first client render has to match the server's markup.
  // Restore it right after mount instead.
  useEffect(() => {
    const saved = readPieceInitials();
    if (saved !== null) setShowInitials(saved);
  }, []);

  const store = useMemo(
    () => ({ state, dispatch, showInitials, setShowInitials, online: null }),
    [state, dispatch, showInitials]
  );

  return <Context.Provider value={store}>{children}</Context.Provider>;
};

export * from "./actions";
