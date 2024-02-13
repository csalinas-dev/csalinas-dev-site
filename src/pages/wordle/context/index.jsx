import { createContext, useReducer } from "react";
import { cloneDeep, range } from "lodash";
import dateFormat from "dateformat";

import Status from "../Status";

import reducer from "./reducer";
import words from "./words.json";
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
  { key: "20", label: "DELETE", status: Status.Default },
  { key: "21", label: "Z", status: Status.Default },
  { key: "22", label: "X", status: Status.Default },
  { key: "23", label: "C", status: Status.Default },
  { key: "24", label: "V", status: Status.Default },
  { key: "25", label: "B", status: Status.Default },
  { key: "26", label: "N", status: Status.Default },
  { key: "27", label: "M", status: Status.Default },
  { key: "28", label: "ENTER", status: Status.Default },
];

export const initialState = {
  board,
  keyboard,
  row: 0,
  guess: "",
  word: "",
  remaining: words.length,
  title: null,
  error: null,
  win: null,
};

export const Context = createContext({
  state: initialState,
  dispatch: () => {},
});

// Get initial state (load or create new game)
const getInitialState = () => {
  const state = cloneDeep(initialState);
  state.word = getTodaysRandomWord();

  // Get Today's Play
  const today = dateFormat(new Date(), "yyyy-mm-dd");
  const saved = localStorage.getItem(today);
  if (saved) {
    const game = JSON.parse(saved);
    state.board = game.board;
    state.keyboard = game.keyboard;
    state.row = game.row;
    state.win = game.win;
    state.word = game.word;
  }

  return state;
};

export const ContextProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, getInitialState());
  return (
    <Context.Provider value={{ state, dispatch }}>{children}</Context.Provider>
  );
};

export * from "./actions";
