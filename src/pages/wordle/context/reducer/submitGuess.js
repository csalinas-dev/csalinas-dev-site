import { filter } from "lodash";
import dateFormat from "dateformat";

import words from "../words.json";
import { updateLetterStatuses } from "./helpers";
import Status from "../../Status";

const getEligibleWords = (state) => {
  const { keyboard } = state;

  const absentLetters = filter(keyboard, (l) => l.status === Status.Absent).map(
    (l) => l.label
  );

  const correctPositions = {};
  const correctLetters = filter(keyboard, (l) => l.status === Status.Correct);
  correctLetters.forEach((l) => {
    correctPositions[l.label] = [];
    state.board.forEach((row) => {
      row.forEach((cell, j) => {
        if (cell.letter === l.label && cell.status === Status.Correct) {
          correctPositions[l.label].push(j);
        }
      });
    });
  });

  const presentPositions = {};
  const presentLetters = filter(keyboard, (l) => l.status === Status.Present);
  presentLetters.forEach((l) => {
    presentPositions[l.label] = [];
    state.board.forEach((row) => {
      row.forEach((cell, j) => {
        if (cell.letter === l.label && cell.status === Status.Present) {
          presentPositions[l.label].push(j);
        }
      });
    });
  });

  const isEligible = (word) => {
    if (word.length !== 5) {
      return false;
    }

    const letters = word.split("");
    const isAbsent = letters.some((l) => absentLetters.includes(l));
    if (isAbsent) {
      return false;
    }

    // For each correctPosition letter, check if this word has the correct letter in the correct positions
    const hasAllCorrectLetters = correctLetters.every((l) => {
      return correctPositions[l.label].every((i) => {
        return letters[i] === l.label;
      });
    });
    if (!hasAllCorrectLetters) {
      return false;
    }

    // For each presentPosition letter, check if this word does not have the present letter in any of the present positions
    const hasPresentLetters = presentLetters.every((l) => {
      return presentPositions[l.label].some((i) => {
        return letters[i] !== l.label && letters.includes(l.label);
      });
    });
    if (!hasPresentLetters) {
      return false;
    }

    return true;
  };

  return filter(words, isEligible);
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
  newState.wordsRemaining = getEligibleWords(newState);
  console.log(newState.wordsRemaining);

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
