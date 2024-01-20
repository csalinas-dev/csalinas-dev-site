import { addLetter, removeLetter, submitGuess } from "./reducers";

export const reducer = (state, action) => {
  switch (action.type) {
    case "ADD LETTER":
      return addLetter(state, action.letter);
    case "REMOVE LETTER":
      return removeLetter(state);
    case "SUBMIT GUESS":
      return submitGuess(state);
    default:
      return state;
  }
};
