import { MAX_MARKS } from "./constants";

// The cell that the next move will clear, or null when the player to move
// still has a free slot. The board highlights it so the swap is never a
// surprise.
export const getExpiringCell = ({ history, turn, winner }) => {
  if (winner !== null) {
    return null;
  }

  const marks = history[turn];
  return marks.length < MAX_MARKS ? null : marks[0];
};
