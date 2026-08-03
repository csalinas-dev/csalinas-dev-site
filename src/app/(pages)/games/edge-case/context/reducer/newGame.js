import {
  createState,
  DEFAULT_GRID_SIZE,
  GRID_SIZES,
  MAX_PLAYERS,
  MIN_PLAYERS,
} from "../../_lib";
import { createPlayers, HOTSEAT_SLOTS } from "../../players";

const clampPlayers = (count) =>
  Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, count));

/**
 * A fresh local game.
 *
 * `createState` throws on a bad size or player count rather than limping on
 * with half a board, so the numbers are clamped to the legal range before they
 * reach it — a stray value from a control should never take the page down.
 *
 * @param {Object} [options]
 * @param {Number} [options.size] - Dots per side: 5, 7 or 9
 * @param {Number} [options.playerCount] - 2 to 4
 * @returns {Object} A local wrapper state
 */
export const newGame = ({ size, playerCount } = {}) => {
  const dots = GRID_SIZES.includes(size) ? size : DEFAULT_GRID_SIZE;
  const count = clampPlayers(playerCount ?? MIN_PLAYERS);
  const slots = HOTSEAT_SLOTS.slice(0, count);

  return {
    // `size` counts DOTS per side. The engine state that comes back counts
    // BOXES in `cols`/`rows` — five dots is a four-by-four board. Keeping the
    // dot count here means the size control and the engine never disagree.
    size: dots,
    playerCount: count,
    players: createPlayers(slots),
    game: createState({ size: dots, slots }),
    setupOpen: false,
  };
};
