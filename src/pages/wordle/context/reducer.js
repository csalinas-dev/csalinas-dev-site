import { take } from "lodash";

const updateBoard = (board, row, guess) => {
  board[row] = board[row].map((l, i) => {
    if (i < guess.length) {
      l.letter = guess[i];
    } else {
      l.letter = "";
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
  const newGuess = take(guess, guess.length - 1).join("");
  return {
    ...state,
    guess: newGuess,
    board: updateBoard(board, row, newGuess),
  };
};

const submitGuess = (state) => {
  const { guess } = state;
  if (guess.length !== 5) {
    return state;
  }
  state.row += 1;
  state.guess = "";
  return state;
};

export const reducer = (state, action) => {
  let newState = state;
  switch (action.type) {
    case "ADD LETTER":
      newState = addLetter(state, action.letter);
      break;
    case "REMOVE LETTER":
      newState = removeLetter(state);
      break;
    case "SUBMIT GUESS":
      newState = submitGuess(state);
      break;
    default:
      break;
  }
  console.log(action.type, newState);
  return newState;
};
