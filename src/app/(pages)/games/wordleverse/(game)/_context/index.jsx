"use client";

import { createContext, useMemo, useReducer, useEffect, useState } from "react";
import dateFormat from "dateformat";
import { useSession } from "next-auth/react";

import { useLoadGame, useMigrateLocalStorage } from "@wordleverse/_hooks";
import { defaultState } from "@wordleverse/_lib/defaults";

import reducer from "./reducer";
import { setCurrentSession } from "./reducer/helpers/saveGame";

export const Context = createContext({
  state: defaultState,
  dispatch: () => {},
});

export const ContextProvider = ({ children, date }) => {
  const { data: session, status } = useSession();
  const [initialState, setInitialState] = useState(defaultState);
  const [loading, setIsLoading] = useState(true);

  // Set the current user session to use when saving games
  setCurrentSession(session);

  // Get initial state (load or create new game)
  useLoadGame(date, session, status, setInitialState, setIsLoading);

  // Migrate localStorage games to database when user logs in
  useMigrateLocalStorage(session, status);

  // Initialize reducer with the loaded state
  const [state, dispatch] = useReducer(reducer, initialState);

  // Update reducer state when initialState changes
  useEffect(() => {
    if (!loading) {
      // This ensures the reducer state is updated when initialState changes
      dispatch({
        type: "INITIALIZE_STATE",
        state: { ...initialState, loading: false },
      });
    }
  }, [initialState, loading]);

  const store = useMemo(
    () => ({
      state: { ...state, loading },
      dispatch,
      gameDate: date || dateFormat(new Date(), "yyyy-mm-dd"),
    }),
    [dispatch, state, loading, date]
  );

  return <Context.Provider value={store}>{children}</Context.Provider>;
};

export * from "./actions";
