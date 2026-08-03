"use client";

import { createContext, useEffect, useMemo, useReducer } from "react";
import { cloneDeep } from "lodash";

import reducer from "./reducer";
import { setExpiryPreview } from "./actions";
import { createBoard } from "./reducer/helpers";

// Where the expiry-preview preference is remembered between visits.
export const EXPIRY_PREVIEW_KEY = "TICTACOVERFLOW-PREVIEW";

export const defaultState = {
  ...createBoard(),
  // Fade the mark that the next move clears. On by default — it teaches the
  // rule. Turning it off is the harder, more strategic game.
  showExpiring: true,
};

// The board's components read the game through this context and never care how
// it is being played. Hotseat fills it from a `useReducer`; online mode fills
// the same shape from the realtime room, which is why Cell, Status, Toolbar and
// Play Again are shared between the two verbatim.
//
//   state    the board, plus this player's `showExpiring` preference
//   dispatch the same actions in both modes; online turns them into requests
//   canPlay  may this player tap an empty cell right now?
//   canReset may they start the next board?
//   online   null when there is no room — the per-player view lives here
export const Context = createContext({
  state: defaultState,
  dispatch: () => {},
  canPlay: true,
  canReset: false,
  online: null,
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

  const store = useMemo(
    () => ({
      state,
      dispatch,
      // Both players share the keyboard, so nothing but a finished game closes
      // the board — and Cell already checks `winner` for that.
      canPlay: true,
      canReset: state.moves > 0,
      online: null,
    }),
    [state, dispatch],
  );
  return <Context.Provider value={store}>{children}</Context.Provider>;
};

export * from "./actions";
export * from "./reducer/helpers";
