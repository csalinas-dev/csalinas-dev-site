export const addLetter = (letter) => ({
  type: "ADD LETTER",
  letter,
});

export const removeLetter = () => ({
  type: "REMOVE LETTER",
});

export const submitGuess = () => ({
  type: "SUBMIT GUESS",
});

export const dismissError = () => ({
  type: "DISMISS ERROR",
});

export const playAgain = () => ({
  type: "PLAY AGAIN",
});
