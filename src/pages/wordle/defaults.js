import { range } from "lodash";

export const Status = Object.freeze({
  Ignore: "ignore",
  Contains: "contains",
  Correct: "correct",
});

export const defaultBoard = range(6).map((_) =>
  range(5).map((_) => ({ c: "", status: Status.Ignore }))
);
