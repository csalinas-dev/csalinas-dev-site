export const swapTiles = (state, droppedOnTile) => {
  const { tileInHand } = state;

  console.log(
    tileInHand,
    state.board[tileInHand],
    droppedOnTile,
    state.board[droppedOnTile]
  );

  return state;
};
