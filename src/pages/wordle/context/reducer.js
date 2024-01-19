import { take } from "lodash";

const updateBoard = (board, row, guess) => {
  board[row] = board[row].map((l, i) => {
    if (i < guess.length) {
      l.letter = guess[i];
    }
    return l;
  });
  return board;
};

const addLetter = (state, letter) => {
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

const removeLetter = (state) => {
  const { board, row, guess } = state;
  if (guess.length === 0) {
    return state;
  }
  const newGuess = take(guess, guess.length - 1);
  return {
    ...state,
    guess: newGuess,
    board: updateBoard(board, row, newGuess),
  };
};

export const reducer = (state, action) => {
  switch (action.type) {
    case "ADD LETTER":
      return addLetter(state, action.letter);
    case "REMOVE LETTER":
      return removeLetter(state);
    case "SUBMIT GUESS":
      return state;
    default:
      return state;
  }
};
