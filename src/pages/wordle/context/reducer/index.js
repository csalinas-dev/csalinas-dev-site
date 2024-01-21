import { addLetter } from "./addLetter";
import { dismissError } from "./dismissError";
import { playAgain } from "./playAgain";
import { removeLetter } from "./removeLetter";
import { submitGuess } from "./submitGuess";

const reducer = (state, action) => {
  switch (action.type) {
    case "ADD LETTER":
      return addLetter(state, action.letter);
    case "REMOVE LETTER":
      return removeLetter(state);
    case "SUBMIT GUESS":
      return submitGuess(state);
    case "DISMISS ERROR":
      return dismissError(state);
    case "PLAY AGAIN":
      return playAgain();
    default:
      return state;
  }
};

export default reducer;
