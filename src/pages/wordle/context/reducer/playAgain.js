import { random, cloneDeep } from "lodash";
import words from "data/words.json";
import { defaultState } from "..";

export const playAgain = ({ expert }) => ({
  ...cloneDeep(defaultState),
  expert,
  word: words[random(words.length)],
  title: "Random Word",
});
