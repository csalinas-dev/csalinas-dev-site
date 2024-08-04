export const updateBoard = (board, row, guess) => {
  board[row] = board[row].map((l, i) => {
    l.letter = i < guess.length ? guess[i] : "";
    return l;
  });
  return board;
};
