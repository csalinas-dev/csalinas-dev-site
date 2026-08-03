import { range } from "lodash";

import Mark from "../../../Mark";

// A fresh board, and the one place its shape is written down. The hotseat
// game's `defaultState` and the networked game's `createState` both start here,
// so the two can never disagree about what an empty game looks like.
//
// `first` is the mark on the clock. Hotseat always opens with X; online the
// previous winner opens the next game, which is the only difference between a
// reset and a rematch.
//
// Pure, and deliberately free of the expiry-preview flag — that is a per-player
// display preference, not part of the board, and online it must never reach the
// room's shared state.
export const createBoard = (first = Mark.X) => ({
  // Nine cells, each holding a Mark or null.
  board: range(9).map(() => null),
  // The cells each player owns, oldest first. This queue drives the expiry.
  history: { [Mark.X]: [], [Mark.O]: [] },
  moves: 0,
  turn: first,
  winner: null,
  winningLine: null,
});
