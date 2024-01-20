import { includes } from "lodash";
import Status from "../../../Status";

export const getLetterStatus = (word, position, letter) => {
  if (word[position] === letter) {
    return Status.Correct;
  }
  return includes(word, letter) ? Status.Present : Status.Absent;
};
