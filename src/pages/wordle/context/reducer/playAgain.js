import { random, cloneDeep } from "lodash";
import words from "data/words.json";
import { initialState } from "..";

export const playAgain = ({ expert }) => ({
  ...cloneDeep(initialState),
  expert,
  word: words[random(words.length)],
  title: "Random Word",
});
