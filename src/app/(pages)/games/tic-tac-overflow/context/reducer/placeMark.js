import Mark from "../../Mark";
import { getWinningLine, MAX_MARKS } from "./helpers";

export const placeMark = (state, cell) => {
  const { board, history, turn, winner } = state;

  // Ignore taps once the game is over or on a cell that is already taken.
  if (winner !== null || board[cell] !== null) {
    return state;
  }

  const marks = [...history[turn], cell];
  const next = [...board];
  next[cell] = turn;

  // Only three marks per player survive — the oldest one expires.
  if (marks.length > MAX_MARKS) {
    next[marks.shift()] = null;
  }

  const winningLine = getWinningLine(next, turn);
  const won = winningLine !== null;
  const opponent = turn === Mark.X ? Mark.O : Mark.X;

  return {
    ...state,
    board: next,
    history: { ...history, [turn]: marks },
    moves: state.moves + 1,
    // The winner stays on the clock so the final board keeps their colours.
    turn: won ? turn : opponent,
    winner: won ? turn : null,
    winningLine,
  };
};
