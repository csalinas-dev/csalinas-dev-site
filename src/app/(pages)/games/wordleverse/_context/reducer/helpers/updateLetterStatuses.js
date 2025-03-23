import { findIndex } from "lodash";
import { getLetterStatuses } from ".";
import Status from "../../../_lib/Status";

export const updateLetterStatuses = (state) => {
  const { board, keyboard, row, word, guess } = state;

  const statuses = getLetterStatuses(word, guess);

  // Update board tile statuses
  board[row] = board[row].map((l, i) => ({ ...l, status: statuses[i] }));

  // Get corresponding letter using the status of the tile
  const getLetterByStatus = (status) =>
    statuses.map((s, i) => (s === status ? guess[i] : null));

  // Update Keyboard Letter with Status
  const updateLetter = (letter, status) => {
    if (!letter) return;
    const keyIdx = findIndex(keyboard, (k) => k.label === letter);
    const key = keyboard[keyIdx];
    if (key.status !== Status.Correct) {
      keyboard[keyIdx] = { ...key, status };
    }
  };

  // Update KB Absent Letters
  getLetterByStatus(Status.Absent).forEach((l) =>
    updateLetter(l, Status.Absent)
  );

  // Update KB Present Letters
  getLetterByStatus(Status.Present).forEach((l) =>
    updateLetter(l, Status.Present)
  );

  // Update KB Correct Letters
  getLetterByStatus(Status.Correct).forEach((l) =>
    updateLetter(l, Status.Correct)
  );

  return {
    ...state,
    board,
    keyboard,
  };
};
