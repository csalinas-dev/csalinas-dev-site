"use client";

import { createContext, useMemo, useReducer, useEffect, useState } from "react";
import dateFormat from "dateformat";
import { useSession } from "next-auth/react";

import { useLoadGame } from "@wordleverse/_hooks/useLoadGame";
import { useMigrateLocalStorage } from "@wordleverse/_hooks/useMigrateLocalStorage";
import { defaultState } from "@wordleverse/_lib/defaults";

import reducer from "./reducer";

export const Context = createContext({
  state: defaultState,
  dispatch: () => {},
});

export const ContextProvider = ({ children, date }) => {
  const { data: session, status } = useSession();
  const [initialState, setInitialState] = useState(defaultState);
  const [loading, setIsLoading] = useState(true);

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
        state: { ...initialState, session, loading: false },
      });
    }
  }, [initialState, loading, session]);

  const store = useMemo(
    () => ({
      state: { ...state, loading, session },
      dispatch,
      gameDate: date || dateFormat(new Date(), "yyyy-mm-dd"),
    }),
    [dispatch, state, loading, session, date]
  );

  return <Context.Provider value={store}>{children}</Context.Provider>;
};

export * from "./actions";
