import { every, find } from "lodash";

import { WINNING_LINES } from "./constants";

// The line the mark occupies, or null when it has not won yet. Only the player
// who just moved can have completed a line, so this is checked for them alone.
export const getWinningLine = (board, mark) =>
  find(WINNING_LINES, (line) => every(line, (cell) => board[cell] === mark)) ??
  null;
