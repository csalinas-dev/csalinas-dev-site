import dateFormat from "dateformat";

export const saveGame = (state) => {
  const { error, guess, title, word, wordsRemaining, ...game } = state;

  if (title !== null) {
    return;
  }

  const today = dateFormat(new Date(), "yyyy-mm-dd");
  localStorage.setItem(today, JSON.stringify(game));
};
