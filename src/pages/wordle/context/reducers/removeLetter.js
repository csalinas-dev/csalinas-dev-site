import { take } from "lodash";
import { updateBoard } from "./helpers";

export const removeLetter = (state) => {
  const { board, row, guess } = state;

  if (guess.length === 0) {
    return state;
  }

  const newGuess = take(guess, guess.length - 1).join("");
  return {
    ...state,
    guess: newGuess,
    board: updateBoard(board, row, newGuess),
  };
};
