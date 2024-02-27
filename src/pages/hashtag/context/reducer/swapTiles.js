import { cloneDeep } from "lodash";
import { saveGame, updateBoardStatuses } from "./helpers";
import Status from "pages/wordle/Status";

export const swapTiles = (state, tileDroppedOn) => {
  const { tileInHand, board, title } = state;
  if (tileInHand === tileDroppedOn) {
    //   Perhaps this error shakes the tile in hand.
    return { ...state, error: "You can't swap a tile with itself." };
  }

  if (
    board[tileInHand].status === Status.Correct ||
    board[tileDroppedOn].status === Status.Correct
  ) {
    //   Perhaps this error shakes the tile in hand.
    return { ...state, error: "You can't swap a correct tile." };
  }

  let newState;
  const moves = state.moves - 1;
  const newBoard = cloneDeep(board);
  newBoard[tileInHand].letter = board[tileDroppedOn].letter;
  newBoard[tileDroppedOn].letter = board[tileInHand].letter;
  const updatedBoard = updateBoardStatuses(state, newBoard);

  // Check if the board is complete
  const isComplete = updatedBoard.every(
    (tile) => !tile || tile.status === Status.Correct
  );
  if (isComplete) {
    newState = {
      ...state,
      moves,
      tileInHand: null,
      win: true,
      board: updatedBoard,
    };
  } else if (moves <= 0) {
    newState = {
      ...state,
      moves,
      tileInHand: null,
      win: false,
      board: state.target,
      shareBoard: updatedBoard,
    };
  } else {
    newState = {
      ...state,
      moves,
      tileInHand: null,
      board: updatedBoard,
    };
  }

  if (!title) {
    saveGame(newState);
  }
  return newState;
};
