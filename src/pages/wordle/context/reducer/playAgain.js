import { random, cloneDeep } from "lodash";
import words from "../words.json";
import { initialState } from "..";

export const playAgain = () => ({
  ...cloneDeep(initialState),
  word: words[random(words.length)],
});
