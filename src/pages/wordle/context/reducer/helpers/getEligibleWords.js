import { filter } from "lodash";

import Status from "../../../Status";
import words from "../../words.json";

export const getEligibleWords = (state) => {
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
