import { updateBoard } from "./helpers";

export const addLetter = (state, letter) => {
  const { board, row, guess, win } = state;

  if (win !== null || row > 5) {
    return state;
  }

  // Do not add more than 5 letters
  if (guess.length >= 5) {
    return state;
  }

  // Update Guess
  const newGuess = guess + letter;
  return {
    ...state,
    guess: newGuess,
    board: updateBoard(board, row, newGuess),
  };
};
