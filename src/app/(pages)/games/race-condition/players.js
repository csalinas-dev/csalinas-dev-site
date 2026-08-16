/**
 * Race Condition — who is who, and what colour they are.
 *
 * The engine only ever deals in opaque "slots". Everything a human needs to
 * tell one slot from another — a name, an initial, a colour — lives here, in
 * ONE shape that both the hotseat game and an online room (#144) build:
 *
 *   { slot, name, initial, color, colorName, token }
 *
 * `color` is a CSS custom property reference, so it resolves anywhere the theme
 * does and stays in step with it.
 *
 * Colour is never the only signal. Every marble is stamped with its player's
 * initial as well as filled with their colour, which matters more here than it
 * does on Connect 404's board: sixteen marbles sit shoulder to shoulder on a
 * 4x4 and the orbit rearranges all of them at once, so "which of these is mine"
 * has to survive a monochrome screen and a moving board.
 */

// Cyan and gold rather than Connect 404's red and blue. Marbles here touch each
// other on every side, and blue-against-yellow is the two-colour pair that
// survives the common colour-vision deficiencies best; red-against-blue at this
// density does not. Both are off the site palette rather than a crayon box.
export const PLAYER_PALETTE = Object.freeze([
  {
    choice: "cyan",
    colorName: "Cyan",
    color: "var(--component)",
    token: "--component",
  },
  {
    choice: "gold",
    colorName: "Gold",
    color: "var(--parenthesis)",
    token: "--parenthesis",
  },
]);

/** The colours a room offers, in the order the picker shows them. */
export const COLOR_CHOICES = Object.freeze(PLAYER_PALETTE.map((p) => p.choice));

/**
 * Wire colour name → palette entry.
 * @param {String} choice - "cyan" | "gold"
 * @returns {?Object} The palette entry, or null for anything unrecognised
 */
export const paletteFor = (choice) =>
  PLAYER_PALETTE.find((entry) => entry.choice === choice) ?? null;

// The slot ids a local hotseat game uses. Strings rather than numbers, matching
// Connect 404 and Edge Case: a slot ends up as an object key often enough that
// it may as well already be one.
export const HOTSEAT_SLOTS = Object.freeze(["p1", "p2"]);

/**
 * Player descriptors for a list of slots, in join order.
 *
 * Names default to the colour ("Cyan", "Gold") because on a shared device the
 * colour IS the identity — nobody has typed a name in. An online room hands in
 * real names instead; the initial follows whatever name it is given.
 *
 * @param {(String|Number)[]} slots - Slots in join order, at most two
 * @param {Object} [options]
 * @param {String[]} [options.names] - Display names, positional, optional
 * @param {String[]} [options.colors] - Chosen colours ("cyan", "gold"), positional
 * @returns {Object[]} One `{ slot, name, initial, color, colorName, token }` per slot
 */
export const createPlayers = (slots, { names = [], colors = [] } = {}) =>
  slots.slice(0, PLAYER_PALETTE.length).map((slot, index) => {
    const { color, colorName, token } =
      paletteFor(colors[index]) ?? PLAYER_PALETTE[index];
    const name = names[index] || colorName;

    return {
      slot,
      name,
      // Trimmed first, so " chris" still initials as "C" rather than a space.
      initial: name.trim().charAt(0).toUpperCase() || colorName.charAt(0),
      color,
      colorName,
      token,
    };
  });

/**
 * Slot → player descriptor, for the many components that hold a slot and need a
 * colour. Falls back to a neutral descriptor rather than throwing, so a
 * mismatched slot can never blank the board mid-game.
 *
 * @param {Object[]} players - Player descriptors
 * @param {String|Number} slot - The slot to look up
 * @returns {Object} A player descriptor
 */
export const playerFor = (players, slot) =>
  players.find((player) => player.slot === slot) ?? {
    slot,
    name: "Player",
    initial: "?",
    color: "var(--foreground)",
    colorName: "grey",
    token: "--foreground",
  };

/**
 * The other player at the table.
 *
 * Step 1 of a turn is about the OPPONENT's marbles, so almost every sentence
 * this game says needs them by name. Two-handed by construction (`MAX_PLAYERS`
 * is 2), so "not you" is the whole rule.
 *
 * @param {Object[]} players - Player descriptors
 * @param {String|Number} slot - The player whose opponent is wanted
 * @returns {Object} A player descriptor
 */
export const opponentOf = (players, slot) =>
  playerFor(
    players,
    players.find((player) => player.slot !== slot)?.slot ?? slot
  );
