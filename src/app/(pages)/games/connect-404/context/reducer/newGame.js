import { createState } from "../../_lib";
import { createPlayers, HOTSEAT_SLOTS } from "../../players";

/**
 * A fresh state, cast and all.
 *
 * @param {Object} [options]
 * @param {String|Number} [options.first] - Who opens; defaults to the first slot
 * @returns {Object} `{ game, players }`
 */
export const newGame = ({ first } = {}) => ({
  game: createState({ slots: HOTSEAT_SLOTS, first }),
  players: createPlayers(HOTSEAT_SLOTS),
});
