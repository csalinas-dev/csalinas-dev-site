import { COLS, MAX_PLAYERS, MIN_PLAYERS, ROWS } from "./constants";

const isSlot = (slot) =>
  (typeof slot === "string" && slot.length > 0) || Number.isInteger(slot);

/**
 * A fresh board.
 *
 * Unlike `dropPiece`, this throws: a bad player list is a programming error in
 * the lobby, not a move a player can make, and it must not produce a
 * half-valid board the rest of the engine then has to defend against.
 *
 * @param {Object} options
 * @param {(String|Number)[]} options.slots - The two player slots, in JOIN
 *   ORDER. Turns rotate through this ARRAY — never through `Object.keys` of
 *   anything, because a room's state is a MySQL JSON column and MySQL does not
 *   preserve object key order. A turn order derived from key order passes every
 *   local test and scrambles only online games.
 * @param {String|Number} [options.first] - Who moves first. Defaults to
 *   `slots[0]`; pass the previous winner so they open the next game.
 * @returns {Object} A game state
 */
export const createState = ({ slots, first } = {}) => {
  if (!Array.isArray(slots) || !slots.every(isSlot)) {
    throw new Error(
      "Connect 404: slots must be an array of non-empty strings or integers"
    );
  }

  if (slots.length < MIN_PLAYERS || slots.length > MAX_PLAYERS) {
    throw new Error(
      `Connect 404: a game needs exactly ${MAX_PLAYERS} players, got ${slots.length}`
    );
  }

  if (new Set(slots).size !== slots.length) {
    throw new Error("Connect 404: slots must be unique");
  }

  if (first !== undefined && !slots.includes(first)) {
    throw new Error("Connect 404: `first` must be one of the slots");
  }

  return {
    cols: COLS,
    rows: ROWS,
    // Column-major stacks, bottom-first: `columns[c][0]` sits on the floor.
    // See the coordinate convention at the top of `board.js`.
    columns: Array.from({ length: COLS }, () => []),
    // Join order, and the array turn rotation reads. Copied so the caller's
    // roster and the board's running order cannot drift apart later.
    slots: [...slots],
    turn: first ?? slots[0],
    lastMove: null,
    winner: null,
    winningLine: null,
    draw: false,
    finished: false,
  };
};

/**
 * The same two players, back at move one — the "play again" button.
 *
 * The winner opens the next game, which is the convention every one of these
 * games uses. A draw has no winner to hand the first move to, so it goes back
 * to join order.
 *
 * @param {Object} state - A finished (or abandoned) game state
 * @returns {Object} A fresh game state with the same players
 */
export const resetState = ({ slots, winner }) =>
  createState({ slots, first: winner ?? slots[0] });
