import { addLetter } from "./addLetter";
import { dismissAlert } from "./dismissAlert";
import { dismissError } from "./dismissError";
import { playAgain } from "./playAgain";
import { removeLetter } from "./removeLetter";
import { submitGuess } from "./submitGuess";
import { toggleExpert } from "./toggleExpert";

const reducer = (state, action) => {
  switch (action.type) {
    case "INITIALIZE_STATE":
      return action.state;
    case "ADD LETTER":
      return addLetter(state, action.letter);
    case "REMOVE LETTER":
      return removeLetter(state);
    case "SUBMIT GUESS":
      return submitGuess(state);
    case "TOGGLE EXPERT":
      return toggleExpert(state);
    case "DISMISS ALERT":
      return dismissAlert(state);
    case "DISMISS ERROR":
      return dismissError(state);
    case "PLAY AGAIN":
      return playAgain(state);
    default:
      return state;
  }
};

export default reducer;
