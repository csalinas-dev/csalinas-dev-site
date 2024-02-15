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

export const dismissAlert = () => ({
  type: "DISMISS ALERT",
});

export const dismissError = () => ({
  type: "DISMISS ERROR",
});

export const playAgain = () => ({
  type: "PLAY AGAIN",
});

export const toggleExpert = () => ({
  type: "TOGGLE EXPERT",
});
