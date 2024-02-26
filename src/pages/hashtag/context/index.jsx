import { createContext, useMemo, useReducer } from "react";
import { cloneDeep, flatten, range } from "lodash";
import dateFormat from "dateformat";

import Status from "../Status";
import { setupPuzzle, getTodaysWords } from "./random";
import reducer from "./reducer";
import { updateBoardStatuses } from "./reducer/helpers";

const board = flatten(
  range(5).map((_, row) =>
    range(5).map((_, col) =>
      row % 2 === 1 || col % 2 === 1
        ? {
            key: `${row}${col}`,
            letter: "",
            status: Status.Default,
          }
        : null
    )
  )
);

export const initialState = {
  board,
  words: [],
  target: [],
  tileInHand: null,
  moves: 0,
  win: null,
  error: null,
};

const getInitialState = () => {
  // Get Today's Play
  const today = dateFormat(new Date(), "yyyy-mm-dd");
  const saved = localStorage.getItem(today);
  if (saved) {
    return JSON.parse(saved);
  }

  // Load New Game
  const state = cloneDeep(initialState);
  state.words = getTodaysWords();
  const { targetBoard: target, puzzleBoard } = setupPuzzle(
    state.words,
    state.board
  );
  state.target = target;
  state.board = updateBoardStatuses(state, puzzleBoard);
  return state;
};

export const Context = createContext({
  state: initialState,
  dispatch: () => {},
});

export const ContextProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, getInitialState());
  const store = useMemo(() => ({ state, dispatch }), [state, dispatch]);
  return <Context.Provider value={store}>{children}</Context.Provider>;
};

export * from "./actions";
