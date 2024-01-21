// import { findIndex } from "lodash";
// import Status from "../../Status";
import { updateBoard } from "./helpers";

export const addLetter = (state, letter) => {
  const { board, keyboard, row, guess } = state;

  // Do not add more than 5 letters
  if (guess.length >= 5) {
    return state;
  }

  // Check if letter is valid
  // const keyIdx = findIndex(keyboard, (k) => k.label === letter);
  // const key = keyboard[keyIdx];
  // if (key.status === Status.Absent) {
  //   return state;
  // }

  // Update Guess
  const newGuess = guess + letter;
  return {
    ...state,
    guess: newGuess,
    board: updateBoard(board, row, newGuess),
  };
};
