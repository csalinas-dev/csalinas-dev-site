"use client";

import { createContext, useMemo, useReducer } from "react";
import { cloneDeep, range } from "lodash";

import Mark from "../Mark";
import reducer from "./reducer";

export const defaultState = {
  // Nine cells, each holding a Mark or null.
  board: range(9).map(() => null),
  // The cells each player owns, oldest first. This queue drives the expiry.
  history: { [Mark.X]: [], [Mark.O]: [] },
  moves: 0,
  turn: Mark.X,
  winner: null,
  winningLine: null,
};

export const Context = createContext({
  state: defaultState,
  dispatch: () => {},
});

export const ContextProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, defaultState, cloneDeep);
  const store = useMemo(() => ({ state, dispatch }), [state, dispatch]);
  return <Context.Provider value={store}>{children}</Context.Provider>;
};

export * from "./actions";
export * from "./reducer/helpers";
