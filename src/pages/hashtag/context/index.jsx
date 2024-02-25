import { createContext, useReducer } from "react";
import { cloneDeep, range } from "lodash";
import dateFormat from "dateformat";

import Status from "../Status";
import { setupPuzzle, getTodaysWords } from "./random";
import reducer from "./reducer";
import { puzzleToBoard } from "./reducer/helpers";

const board = range(5).map((_, row) =>
  range(5).map((_, col) =>
    row % 2 === 1 || col % 2 === 1
      ? {
          key: `${row}${col}`,
          letter: "",
          status: Status.Default,
        }
      : null
  )
);

export const initialState = {
  board,
  words: [],
  target: [],
  puzzle: [],
  moves: 0,
};

export const Context = createContext({
  state: initialState,
  dispatch: () => {},
});

const getInitialState = () => {
  // Get Today's Play
  const today = dateFormat(new Date(), "yyyy-mm-dd");
  const saved = localStorage.getItem(today);
  if (saved) {
    return JSON.parse(saved);
  }

  // Load New Game
  const state = cloneDeep(initialState);
  const words = getTodaysWords();
  const { target, puzzle } = setupPuzzle(state.board, words);
  const board = puzzleToBoard(state.board, puzzle);
  return {
    ...state,
    words,
    target,
    puzzle,
    board,
  };
};

export const ContextProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, getInitialState());
  return (
    <Context.Provider value={{ state, dispatch }}>{children}</Context.Provider>
  );
};

export * from "./actions";
