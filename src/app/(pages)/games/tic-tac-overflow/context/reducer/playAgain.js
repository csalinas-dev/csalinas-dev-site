import { createBoard } from "./helpers";

// A new board, but the expiry preview is a player preference rather than part
// of the game, so it survives the reset. Hotseat always opens with X; online,
// the winner opens the next game (see game.js) — same board, different clock.
export const playAgain = ({ showExpiring }) => ({
  ...createBoard(),
  showExpiring,
});
