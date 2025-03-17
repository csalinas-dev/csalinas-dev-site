"use client";

import { createContext, useMemo, useReducer, useEffect, useState } from "react";
import { cloneDeep, range } from "lodash";
import dateFormat from "dateformat";
import { useSession } from "next-auth/react";

import Status from "../Status";

import reducer from "./reducer";
import { getEligibleWords } from "./reducer/helpers";
import { getTodaysRandomWord } from "./random";

const board = range(6).map((_, row) =>
  range(5).map((_, col) => ({
    key: `${row}${col}`,
    letter: "",
    status: Status.Default,
  }))
);

const keyboard = [
  { key: "00", label: "Q", status: Status.Default },
  { key: "01", label: "W", status: Status.Default },
  { key: "02", label: "E", status: Status.Default },
  { key: "03", label: "R", status: Status.Default },
  { key: "04", label: "T", status: Status.Default },
  { key: "05", label: "Y", status: Status.Default },
  { key: "06", label: "U", status: Status.Default },
  { key: "07", label: "I", status: Status.Default },
  { key: "08", label: "O", status: Status.Default },
  { key: "09", label: "P", status: Status.Default },
  { key: "10", label: "A", status: Status.Default },
  { key: "11", label: "S", status: Status.Default },
  { key: "12", label: "D", status: Status.Default },
  { key: "13", label: "F", status: Status.Default },
  { key: "14", label: "G", status: Status.Default },
  { key: "15", label: "H", status: Status.Default },
  { key: "16", label: "J", status: Status.Default },
  { key: "17", label: "K", status: Status.Default },
  { key: "18", label: "L", status: Status.Default },
  { key: "20", label: "ENTER", status: Status.Default },
  { key: "21", label: "Z", status: Status.Default },
  { key: "22", label: "X", status: Status.Default },
  { key: "23", label: "C", status: Status.Default },
  { key: "24", label: "V", status: Status.Default },
  { key: "25", label: "B", status: Status.Default },
  { key: "26", label: "N", status: Status.Default },
  { key: "27", label: "M", status: Status.Default },
  { key: "28", label: "DELETE", status: Status.Default },
];

export const defaultState = {
  board,
  keyboard,
  row: 0,
  guess: "",
  word: "",
  wordsRemaining: [],
  expert: false,
  title: null,
  error: null,
  win: null,
  loading: true,
};

export const Context = createContext({
  state: defaultState,
  dispatch: () => {},
});

export const ContextProvider = ({ children }) => {
  const { data: session, status } = useSession();
  const [initialState, setInitialState] = useState(defaultState);
  const [isLoading, setIsLoading] = useState(true);

  // Get initial state (load or create new game)
  useEffect(() => {
    const loadGame = async () => {
      setIsLoading(true);
      const today = dateFormat(new Date(), "yyyy-mm-dd");
      const state = cloneDeep(defaultState);
      state.word = getTodaysRandomWord();
      
      // If user is not authenticated, use localStorage as fallback
      if (status === "loading") {
        return;
      }
      
      if (!session) {
        // Use localStorage for non-authenticated users
        if (typeof window !== "undefined") {
          state.expert = localStorage.getItem("expert") === "true";
          const saved = localStorage.getItem(`WORDLEVERSE-${today}`);
          if (saved) {
            const game = JSON.parse(saved);
            const newState = {
              ...state,
              ...game,
            };
            newState.wordsRemaining = getEligibleWords(newState);
            setInitialState(newState);
          } else {
            setInitialState(state);
          }
        } else {
          setInitialState(state);
        }
      } else {
        // Use database for authenticated users
        try {
          const response = await fetch(`/api/wordleverse/game?date=${today}`);
          if (response.ok) {
            const gameData = await response.json();
            if (gameData) {
              // Convert database statuses to enum values
              gameData.board = gameData.board.map(row =>
                row.map(cell => ({
                  ...cell,
                  status: cell.status === "default" ? Status.Default :
                          cell.status === "correct" ? Status.Correct :
                          cell.status === "present" ? Status.Present :
                          cell.status === "absent" ? Status.Absent :
                          Status.Default
                }))
              );
              
              gameData.keyboard = gameData.keyboard.map(key => ({
                ...key,
                status: key.status === "default" ? Status.Default :
                        key.status === "correct" ? Status.Correct :
                        key.status === "present" ? Status.Present :
                        key.status === "absent" ? Status.Absent :
                        Status.Default
              }));
              
              const newState = {
                ...state,
                board: gameData.board,
                keyboard: gameData.keyboard,
                row: gameData.row,
                expert: gameData.expert,
                win: gameData.win,
                word: gameData.word,
              };
              newState.wordsRemaining = getEligibleWords(newState);
              setInitialState(newState);
            } else {
              setInitialState(state);
            }
          } else {
            setInitialState(state);
          }
        } catch (error) {
          console.error("Error loading game:", error);
          setInitialState(state);
        }
      }
      
      setIsLoading(false);
    };

    loadGame();
  }, [session, status]);

  const [state, dispatch] = useReducer(reducer, initialState);
  
  // Add loading state to the context
  const contextState = {
    ...state,
    loading: isLoading,
  };
  
  const store = useMemo(() => ({
    state: contextState,
    dispatch,
    session
  }), [contextState, dispatch, session]);
  
  return <Context.Provider value={store}>{children}</Context.Provider>;
};

export * from "./actions";
