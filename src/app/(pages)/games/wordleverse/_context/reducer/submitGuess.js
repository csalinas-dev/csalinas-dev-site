import { filter } from "lodash";

import words from "@/data/words.json";
import Status from "../../_lib/Status";

import { getEligibleWords, saveGame, updateLetterStatuses } from "./helpers";

export const submitGuess = (state) => {
  const { expert, guess, row, wordsRemaining } = state;

  // Check if guess is ready to submit
  if (guess.length !== 5) {
    return state;
  }

  if (guess === "IQUIT") {
    const newState = {
      ...state,
      guess: "",
      row: 6,
      win: false,
    };
    saveGame(newState);
    return newState;
  }

  // Check if guess is in list of words
  if (!words.includes(guess)) {
    return {
      ...state,
      error: "NOT IN DICTIONARY",
    };
  }

  // Check if expert mode is on and this is an invalid guess
  if (row > 0 && expert && !wordsRemaining.includes(guess)) {
    return {
      ...state,
      error: "USE PREVIOUS CLUES",
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
