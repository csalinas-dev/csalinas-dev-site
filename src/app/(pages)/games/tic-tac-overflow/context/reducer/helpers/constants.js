// A player never keeps more than three marks on the board — placing a fourth
// clears their oldest one.
export const MAX_MARKS = 3;

// Every trio of cells that wins the game.
export const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];
