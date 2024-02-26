import { cloneDeep } from "lodash";

export const swapTiles = ({ tileInHand, board, ...state }, tileDroppedOn) => {
  const newBoard = cloneDeep(board);
  newBoard[tileInHand].letter = board[tileDroppedOn].letter;
  newBoard[tileDroppedOn].letter = board[tileInHand].letter;

  return {
    ...state,
    board: newBoard,
    tileInHand: null,
  };
};
