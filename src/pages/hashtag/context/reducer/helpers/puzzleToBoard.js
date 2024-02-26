export const puzzleToBoard = (board, puzzle) => {
  let current = 0;
  const puzzleBoard = board.map((tile) => {
    if (!tile) {
      return tile;
    }
    tile.letter = puzzle[current++];
    return tile;
  });
  return puzzleBoard;
};
