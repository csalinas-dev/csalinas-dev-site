import { cloneDeep } from "lodash";
import { defaultState, getRandomWords, setupPuzzle } from "..";
import { updateBoardStatuses } from "./helpers";

export const playAgain = () => {
  const state = cloneDeep(defaultState);
  state.words = getRandomWords();
  const { targetBoard: target, puzzleBoard } = setupPuzzle(
    state.words,
    state.board,
    false
  );
  state.target = target;
  state.board = updateBoardStatuses(state, puzzleBoard);
  state.title = "Random";
  return state;
};
