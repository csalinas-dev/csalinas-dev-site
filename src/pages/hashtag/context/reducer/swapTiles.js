import { cloneDeep } from "lodash";
import { updateBoardStatuses } from "./helpers";

export const swapTiles = ({ tileInHand, board, ...state }, tileDroppedOn) => {
  const newBoard = cloneDeep(board);
  newBoard[tileInHand].letter = board[tileDroppedOn].letter;
  newBoard[tileDroppedOn].letter = board[tileInHand].letter;

  const updatedBoard = updateBoardStatuses(state, newBoard);

  return {
    ...state,
    board: updatedBoard,
    tileInHand: null,
  };
};
