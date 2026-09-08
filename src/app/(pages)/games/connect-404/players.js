/**
 * Connect 404 — who is who, and what colour they are.
 *
 * The engine only ever deals in opaque "slots". Everything a human needs to
 * tell one slot from another — a name, an initial, a colour — lives here, in
 * ONE shape that both the hotseat game and an online room (#114) build:
 *
 *   { slot, name, initial, color, colorName, token }
 *
 * `color` is a CSS custom property reference, so it resolves anywhere the theme
 * does and stays in step with it.
 *
 * `initial` stays on the descriptor and the turn banner and the endgame panel
 * still print it. The BOARD draws it only when the player has asked for it
 * (`src/lib/pieceInitials.js`, off by default): nobody types a name in this
 * game, so an initial was always just the first letter of the colour, and red
 * against blue is CIEDE2000 51+ under every common colour-vision deficiency
 * with both discs clearing 3:1 against the board. The one vision colour alone
 * does not serve is luminance-only — the two discs are 1.3-2.2:1 apart — and
 * that is what the preference is for.
 */

// Red first, blue second, straight out of the reference implementation
// (`csalinas-dev/connect4`, where P1 is a red disc and P2 a blue one) and off
// the site palette rather than out of a crayon box.
export const PLAYER_PALETTE = Object.freeze([
  { choice: "red", colorName: "Red", color: "var(--invalid)", token: "--invalid" },
  {
    choice: "blue",
    colorName: "Blue",
    color: "var(--component)",
    token: "--component",
  },
]);

/** The colours a room offers, in the order the picker shows them. */
export const COLOR_CHOICES = Object.freeze(PLAYER_PALETTE.map((p) => p.choice));

/**
 * Wire colour name → palette entry.
 * @param {String} choice - "red" | "blue"
 * @returns {?Object} The palette entry, or null for anything unrecognised
 */
export const paletteFor = (choice) =>
  PLAYER_PALETTE.find((entry) => entry.choice === choice) ?? null;

// The slot ids a local hotseat game uses. Strings rather than numbers, matching
// Edge Case: a slot ends up as an object key often enough that it may as well
// already be one.
export const HOTSEAT_SLOTS = Object.freeze(["p1", "p2"]);

/**
 * Player descriptors for a list of slots, in join order.
 *
 * Names default to the colour ("Red", "Blue") because on a shared device the
 * colour IS the identity — nobody has typed a name in. An online room hands in
 * real names instead; the initial follows whatever name it is given.
 *
 * @param {(String|Number)[]} slots - Slots in join order, at most two
 * @param {Object} [options]
 * @param {String[]} [options.names] - Display names, positional, optional
 * @param {String[]} [options.colors] - Chosen colours ("red", "blue"), positional
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
