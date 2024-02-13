import { filter } from "lodash";
import dateFormat from "dateformat";

import words from "../words.json";
import { updateLetterStatuses } from "./helpers";
import Status from "../../Status";

const getEligibleWords = (state) => {
  const { board, wordsRemaining } = state;

  const absent = [];
  const correct = {};
  const present = {};

  board.forEach((guess) => {
    guess.forEach((letter, i) => {
      // Add absent letters to absent array
      if (letter.status === Status.Absent) {
        absent.push(letter.letter);
      }

      if (letter.status === Status.Correct) {
        if (!correct[letter.letter]) {
          correct[letter.letter] = new Set();
        }
        correct[letter.letter].add(i);
      }

      if (letter.status === Status.Present) {
        if (!present[letter.letter]) {
          present[letter.letter] = new Set();
        }
        present[letter.letter].add(i);
      }
    });
  });

  const isEligible = (word) => {
    if (word.length !== 5) {
      return false;
    }

    const letters = word.split("");

    const isAbsent = letters.some((l) => absent.includes(l));
    if (isAbsent) {
      return false;
    }

    // For each correct letter, check if this word has the correct letter in all the correct positions
    const hasAllCorrectLetters = Object.keys(correct).every((l) => {
      return Array.from(correct[l]).every((i) => {
        return letters[i] === l;
      });
    });
    if (!hasAllCorrectLetters) {
      return false;
    }

    // For each presentPosition letter, check if this word does not have the present letter in any of the present positions
    const hasPresentLetters = Object.keys(present).every((l) => {
      return Array.from(present[l]).some((i) => {
        return letters[i] !== l && letters.includes(l);
      });
    });
    if (!hasPresentLetters) {
      return false;
    }

    return true;
  };

  const list = wordsRemaining.length ? wordsRemaining : words;
  return filter(list, isEligible);
};

const saveGame = (state) => {
  const { error, guess, title, word, wordsRemaining, ...game } = state;

  if (title !== null) {
    return;
  }

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
