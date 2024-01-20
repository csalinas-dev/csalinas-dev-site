import { updateBoard } from "./helpers";

export const addLetter = (state, letter) => {
  const { board, row, guess } = state;
  if (guess.length >= 5) {
    return state;
  }
  const newGuess = guess + letter;
  return {
    ...state,
    guess: newGuess,
    board: updateBoard(board, row, newGuess),
  };
};
