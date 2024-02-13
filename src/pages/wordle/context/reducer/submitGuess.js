import { filter, forEach } from "lodash";
import dateFormat from "dateformat";

import words from "../words.json";
import { updateLetterStatuses } from "./helpers";
import Status from "../../Status";

const countEligibleWords = (state) => {
  const { board, keyboard } = state;

  const getCorrectLetter = (idx) =>
    board.find((guess) => guess[idx].status === Status.Correct)?.[idx]?.letter;
  const correctLetters = {
    0: getCorrectLetter(0),
    1: getCorrectLetter(1),
    2: getCorrectLetter(2),
    3: getCorrectLetter(3),
    4: getCorrectLetter(4),
  };

  const presentLetters = keyboard
    .filter((l) => l.status === Status.Present)
    .map((l) => l.label);
  const absentLetters = keyboard
    .filter((l) => l.status === Status.Absent)
    .map((l) => l.label);

  console.log(correctLetters, presentLetters, absentLetters);

  return words.length;
};

const saveGame = (state) => {
  const { board, row, win, word, title, keyboard } = state;

  if (title !== null) {
    return;
  }

  const game = {
    board,
    keyboard,
    row,
    win,
    word,
  };
  const today = dateFormat(new Date(), "yyyy-mm-dd");
  localStorage.setItem(today, JSON.stringify(game));
};

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

  // Count Eligible Words
  newState.remaining = countEligibleWords(newState);

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
