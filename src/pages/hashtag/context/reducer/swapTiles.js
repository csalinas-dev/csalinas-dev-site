import { cloneDeep } from "lodash";
import { updateBoardStatuses } from "./helpers";
import Status from "pages/wordle/Status";

export const swapTiles = (state, tileDroppedOn) => {
  const { tileInHand, board } = state;
  if (tileInHand === tileDroppedOn) {
    // TODO: Error "You can't swap a tile with itself."
    //   Perhaps this error shakes the tile in hand.
    return state;
  }

  if (
    board[tileInHand].status === Status.Correct ||
    board[tileDroppedOn].status === Status.Correct
  ) {
    // TODO: Error "You can't swap a correct tile."
    //   Perhaps this error shakes the tile in hand.
    return state;
  }

  const moves = state.moves + 1;
  if (moves >= 12) {
    return {
      ...state,
      moves,
      tileInHand: null,
      win: false,
      board: state.target,
    };
  }

  const newBoard = cloneDeep(board);
  newBoard[tileInHand].letter = board[tileDroppedOn].letter;
  newBoard[tileDroppedOn].letter = board[tileInHand].letter;

  const updatedBoard = updateBoardStatuses(state, newBoard);

  // Check if the board is complete
  const isComplete = updatedBoard.every(
    (tile) => !tile || tile.status === Status.Correct
  );
  if (isComplete) {
    return {
      ...state,
      moves,
      tileInHand: null,
      win: true,
      board: updatedBoard,
    };
  }

  return {
    ...state,
    moves,
    tileInHand: null,
    board: updatedBoard,
  };
};
