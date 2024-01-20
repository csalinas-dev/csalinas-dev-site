import { findIndex } from "lodash";
import { getLetterStatus } from "./";

export const updateLetterStatuses = (state) => {
  const { board, keyboard, row, word } = state;

  board[row] = board[row].map((l, i) => {
    // Get New Letter Status
    const status = getLetterStatus(word, i, l.letter);

    // Update Keyboard Letter
    // TODO: Handle double letters
    const keyIdx = findIndex(keyboard, (k) => k.label === l.letter);
    const key = keyboard[keyIdx];
    keyboard[keyIdx] = {
      ...key,
      status,
    };

    // Update Board Letter
    l.status = status;
    return l;
  });

  return {
    ...state,
    board,
    keyboard,
  };
};
