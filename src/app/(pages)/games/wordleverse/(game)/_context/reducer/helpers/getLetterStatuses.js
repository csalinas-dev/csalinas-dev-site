import Status from "@wordleverse/_lib/Status";

export const getLetterStatuses = (word, guess) => {
  const result = Array(guess.length).fill(Status.Absent);
  const wordLettersCount = {};

  // Count the occurrences of each letter in the target word.
  for (let letter of word) {
    if (wordLettersCount[letter]) {
      wordLettersCount[letter]++;
    } else {
      wordLettersCount[letter] = 1;
    }
  }

  // First pass: Mark greens and decrease count for correct letters.
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === word[i]) {
      result[i] = Status.Correct;
      wordLettersCount[guess[i]]--;
    }
  }

  // Second pass: Mark yellows, considering the remaining counts.
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] !== word[i] && wordLettersCount[guess[i]] > 0) {
      result[i] = Status.Present;
      wordLettersCount[guess[i]]--;
    }
  }

  return result;
};
