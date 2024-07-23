import dateFormat from "dateformat";

export const saveGame = (state) => {
  const today = dateFormat(new Date(), "yyyy-mm-dd");
  localStorage.setItem(`HASHTAG-${today}`, JSON.stringify(state));
};
