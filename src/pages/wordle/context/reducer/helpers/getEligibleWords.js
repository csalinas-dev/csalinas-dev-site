import { filter } from "lodash";

import Status from "../../../Status";
import words from "../../words.json";

export const getEligibleWords = (state) => {
  const { board, wordsRemaining } = state;

  let absent = [];
  const correct = {};
  const present = {};

  board.forEach((guess) => {
    guess.forEach((l, i) => {
      const { letter, status } = l;
      // Add absent letters to absent array
      if (status === Status.Absent) {
        if (present[letter] || correct[letter]) {
          present[letter].add(i);
        } else {
          absent.push(letter);
        }
      }

      if (status === Status.Correct) {
        if (!correct[letter]) {
          correct[letter] = new Set();
        }
        correct[letter].add(i);
      }

      if (status === Status.Present) {
        if (!present[letter]) {
          present[letter] = new Set();
        }
        present[letter].add(i);
      }
    });
  });

  const isEligible = (word) => {
    if (word.length !== 5) {
      return false;
    }

    const letters = word.split("");

    // Ensure this word does not include any absent letters
    const isAbsent = letters.some((l) => absent.includes(l));
    if (isAbsent) {
      return false;
    }

    // Ensure this word has every correct letter in every correct position
    const hasAllCorrectLetters = Object.keys(correct).every((l) =>
      Array.from(correct[l]).every((i) => letters[i] === l)
    );
    if (!hasAllCorrectLetters) {
      return false;
    }

    // Ensure this word includes the present letter, but not in any of their present positions
    const hasPresentLetters = Object.keys(present).every(
      (l) =>
        Array.from(present[l]).every((i) => letters[i] !== l) &&
        letters.includes(l)
    );
    if (!hasPresentLetters) {
      return false;
    }

    // This is an elgible word
    return true;
  };

  const list = wordsRemaining.length ? wordsRemaining : words;
  const filtered = filter(list, isEligible);
  return filtered;
};
