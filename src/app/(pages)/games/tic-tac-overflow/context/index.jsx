"use client";

import { createContext, useEffect, useMemo, useReducer } from "react";
import { cloneDeep, range } from "lodash";

import Mark from "../Mark";
import reducer from "./reducer";
import { setExpiryPreview } from "./actions";

// Where the expiry-preview preference is remembered between visits.
export const EXPIRY_PREVIEW_KEY = "TICTACOVERFLOW-PREVIEW";

export const defaultState = {
  // Nine cells, each holding a Mark or null.
  board: range(9).map(() => null),
  // The cells each player owns, oldest first. This queue drives the expiry.
  history: { [Mark.X]: [], [Mark.O]: [] },
  moves: 0,
  turn: Mark.X,
  winner: null,
  winningLine: null,
  // Fade the mark that the next move clears. On by default — it teaches the
  // rule. Turning it off is the harder, more strategic game.
  showExpiring: true,
};

export const Context = createContext({
  state: defaultState,
  dispatch: () => {},
});

export const ContextProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, defaultState, cloneDeep);

  // The stored preference can't seed the initial state: this page is
  // prerendered, so the first client render has to match the server's markup.
  // Restore it right after mount instead.
  useEffect(() => {
    const saved = localStorage.getItem(EXPIRY_PREVIEW_KEY);
    if (saved !== null) {
      dispatch(setExpiryPreview(saved === "true"));
    }
  }, []);

  const store = useMemo(() => ({ state, dispatch }), [state, dispatch]);
  return <Context.Provider value={store}>{children}</Context.Provider>;
};

export * from "./actions";
export * from "./reducer/helpers";
