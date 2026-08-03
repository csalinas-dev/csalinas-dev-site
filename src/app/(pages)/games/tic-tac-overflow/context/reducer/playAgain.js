import { cloneDeep } from "lodash";

import { defaultState } from "..";

// A new board, but the expiry preview is a player preference rather than part
// of the game, so it survives the reset.
export const playAgain = ({ showExpiring }) => ({
  ...cloneDeep(defaultState),
  showExpiring,
});
