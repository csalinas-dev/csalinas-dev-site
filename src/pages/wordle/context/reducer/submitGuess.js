import { filter } from "lodash";
import words from "../words.json";
import { updateLetterStatuses } from "./helpers";
import Status from "../../Status";

export const submitGuess = (state) => {
  const { guess } = state;

  // Check if guess is ready to submit
  if (guess.length !== 5) {
    return state;
  }

  // Check if guess is in list of words
  if (!words.includes(guess)) {
    return {
      ...state,
      error: "NOT IN LIST",
    };
  }

  // Update State
  var newState = updateLetterStatuses(state);

  // Check for win
  const correct = filter(
    newState.board[newState.row],
    (l) => l.status === Status.Correct
  );
  if (correct.length === 5) {
    console.log("WIN!");
    return {
      ...newState,
      win: true,
    };
  }

  // Move to Next Row
  newState.row += 1;
  newState.guess = "";
  return newState;
};
