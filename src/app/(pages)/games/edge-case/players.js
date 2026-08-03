/**
 * Edge Case — who is who, and what colour they are.
 *
 * The engine only ever deals in opaque "slots". Everything a human needs to
 * tell one slot from another — a name, an initial, a colour — lives here, in
 * ONE shape that both the local hotseat game and the online room (#94) build:
 *
 *   { slot, name, initial, color, colorName }
 *
 * `color` is a CSS custom property reference, so it resolves inside inline SVG
 * exactly as it does in CSS and stays in step with the site theme.
 *
 * Colour is never the only signal. Every player also carries an `initial`, and
 * every claimed box is stamped with it — blue/purple and orange/green are the
 * classic confusion pairs, and a colour-only board is unplayable for a chunk of
 * people.
 */

import { MAX_PLAYERS } from "./_lib";

// Slot colours in join order, straight out of the site palette. Four of them,
// because four is the most players a game takes.
//
// `choice` is the wire name — what a player's chosen colour is stored as on
// their seat in a room (`GameRoom.players[].color`) and what the realtime core
// hands out and locks. Lower case and palette-neutral on purpose: it is data,
// not a CSS token, and it survives the site's theme being repainted.
export const PLAYER_PALETTE = Object.freeze([
  { choice: "blue", colorName: "Blue", color: "var(--component)", token: "--component" },
  { choice: "purple", colorName: "Purple", color: "var(--module)", token: "--module" },
  { choice: "orange", colorName: "Orange", color: "var(--selector)", token: "--selector" },
  { choice: "green", colorName: "Green", color: "var(--type)", token: "--type" },
]);

/** The colours a room offers, in the order the picker shows them. */
export const COLOR_CHOICES = Object.freeze(PLAYER_PALETTE.map((p) => p.choice));

/**
 * Wire colour name → palette entry.
 * @param {String} choice - "blue" | "purple" | "orange" | "green"
 * @returns {?Object} The palette entry, or null for anything unrecognised
 */
export const paletteFor = (choice) =>
  PLAYER_PALETTE.find((entry) => entry.choice === choice) ?? null;

// The slot ids a local hotseat game uses. Strings, not numbers: `state.scores`
// is an object, and object keys stringify whether you meant them to or not.
export const HOTSEAT_SLOTS = Object.freeze(["p1", "p2", "p3", "p4"]);

/**
 * Player descriptors for a list of slots, in join order.
 *
 * Names default to the colour ("Blue", "Purple", …) because on a shared device
 * the colour IS the identity — nobody has typed a name in. An online room hands
 * in real names instead; the initial follows whatever name it is given.
 *
 * Colours default to seat order for the same reason: on one device nobody picks
 * one. Online, players choose, so `colors` carries their choices positionally —
 * and an unrecognised or missing choice falls back to the seat's colour rather
 * than leaving a player with no colour at all.
 *
 * @param {(String|Number)[]} slots - Slots in join order, at most MAX_PLAYERS
 * @param {Object} [options]
 * @param {String[]} [options.names] - Display names, positional, optional
 * @param {String[]} [options.colors] - Chosen colours ("blue", …), positional
 * @returns {Object[]} One `{ slot, name, initial, color, colorName }` per slot
 */
export const createPlayers = (slots, { names = [], colors = [] } = {}) =>
  slots.slice(0, MAX_PLAYERS).map((slot, index) => {
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
 * Slot → player descriptor, for the many components that hold a slot and need
 * a colour. Falls back to a neutral descriptor rather than throwing, so a
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
