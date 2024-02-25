import { createContext, useReducer } from "react";
import { cloneDeep, range } from "lodash";

import Status from "../Status";
import reducer from "./reducer";
import { getTodaysWords } from "./random";

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
};

export const Context = createContext({
  state: initialState,
  dispatch: () => {},
});

const getInitialState = () => {
  const state = cloneDeep(initialState);
  getTodaysWords();
  return state;
};

export const ContextProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, getInitialState());
  return (
    <Context.Provider value={{ state, dispatch }}>{children}</Context.Provider>
  );
};

export * from "./actions";
