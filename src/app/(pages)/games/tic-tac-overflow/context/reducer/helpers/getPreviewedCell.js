import { getExpiringCell } from "./getExpiringCell";

// The cell the board should actually mark as on its way out — the expiring
// cell, unless the player has turned the preview off to make themselves track
// it from memory. Kept separate from getExpiringCell so the rule ("which mark
// expires next") stays independent of whether we show it.
export const getPreviewedCell = (state) =>
  state.showExpiring ? getExpiringCell(state) : null;
