import { cellCount, pieceCount } from "./board";

/**
 * How the game stands, or how it ended.
 *
 * A DRAW is reported as a draw. A full board with no line is a real outcome —
 * neither player lost it — so `winner` stays null and `draw` is true, and
 * anything rendering a result must read `draw` before reaching for a name.
 *
 * The three end fields are decided by `dropPiece` at the moment the piece
 * lands and stored on the state, because the online half persists that state
 * and everybody has to agree on it. This reads them back and adds the counts a
 * status line wants, rather than re-deciding the game.
 *
 * @param {Object} state - A game state, finished or not
 * @returns {Object} winner, draw, winningLine, finished, turn, moves, cells
 *   and remaining
 */
export const getResult = (state) => {
  const { draw, finished, turn, winner, winningLine } = state;
  const moves = pieceCount(state);
  const cells = cellCount(state);

  return {
    // Null while the game is live, and null on a draw. `draw` is the field to
    // read in the second case.
    winner: winner ?? null,
    draw: draw === true,
    // The exact cells to highlight, in board order — four of them, or more on
    // the rare run of five.
    winningLine: winningLine ?? null,
    finished: finished === true,
    // Whose move it is; on a finished board, whoever played the last piece.
    turn,
    moves,
    cells,
    remaining: cells - moves,
  };
};
