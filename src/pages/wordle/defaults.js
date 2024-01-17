import { range } from "lodash";

export const Status = Object.freeze({
  Ignore: "ignore",
  Contains: "contains",
  Correct: "correct",
});

export const defaultBoard = range(6).map((_, row) =>
  range(5).map((_, col) => ({
    key: `${row}${col}`,
    c: "W",
    status: Status.Ignore,
  }))
);
