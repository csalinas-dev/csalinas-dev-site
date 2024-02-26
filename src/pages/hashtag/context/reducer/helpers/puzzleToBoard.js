export const puzzleToBoard = (board, puzzle) => {
  let current = 0;
  return board.map((tile) => {
    if (!tile) {
      return tile;
    }
    const piece = puzzle[current++];
    tile.letter = piece.letter;
    tile.status = piece.status;
    return tile;
  });
};
