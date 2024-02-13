import { filter } from "lodash";

import words from "../words.json";
import Status from "../../Status";

import { getEligibleWords, saveGame, updateLetterStatuses } from "./helpers";

export const submitGuess = (state) => {
  const { expert, guess, row, wordsRemaining } = state;

  // Check if guess is ready to submit
  if (guess.length !== 5) {
    return state;
  }

  // Check if guess is in list of words
  const list = row > 0 && expert ? wordsRemaining : words;
  if (!list.includes(guess)) {
    return {
      ...state,
      error: "INVALID WORD",
    };
  }

  // Update State
  var newState = updateLetterStatuses(state);

  // Count Eligible Words
  newState.wordsRemaining = getEligibleWords(newState);

  // Check for win
  const correct = filter(
    newState.board[newState.row],
    (l) => l.status === Status.Correct
  );
  if (correct.length === 5) {
    newState.win = true;
    saveGame(newState);
    return newState;
  }

  // Move to Next Row
  newState.row += 1;
  newState.guess = "";

  // Check for loss
  if (newState.row > 5) {
    newState.win = false;
  }

  saveGame(newState);
  return newState;
};
