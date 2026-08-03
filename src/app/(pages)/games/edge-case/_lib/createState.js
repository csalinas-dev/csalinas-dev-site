import {
  DEFAULT_GRID_SIZE,
  GRID_SIZES,
  MAX_PLAYERS,
  MIN_PLAYERS,
} from "./constants";
import { boxCount, horizontalEdgeCount, verticalEdgeCount } from "./edges";

const isSlot = (slot) =>
  (typeof slot === "string" && slot.length > 0) || Number.isInteger(slot);

/**
 * A fresh game.
 *
 * Unlike `drawEdge`, this throws: a bad size or player list is a programming
 * error in the lobby, not a move a player can make, and it must not produce a
 * half-valid board that the rest of the engine then has to defend against.
 *
 * @param {Object} options
 * @param {Number} options.size - Dots per side: 5, 7 or 9 (so 4, 6 or 8 boxes)
 * @param {(String|Number)[]} options.slots - Player slots in JOIN ORDER; turns
 *   advance through this array and wrap. 2 to 4 entries, unique.
 * @returns {Object} A game state
 */
export const createState = ({ size = DEFAULT_GRID_SIZE, slots } = {}) => {
  if (!GRID_SIZES.includes(size)) {
    throw new Error(
      `Edge Case: size must be one of ${GRID_SIZES.join(", ")} dots, got ${size}`
    );
  }

  if (!Array.isArray(slots) || !slots.every(isSlot)) {
    throw new Error(
      "Edge Case: slots must be an array of non-empty strings or integers"
    );
  }

  if (slots.length < MIN_PLAYERS || slots.length > MAX_PLAYERS) {
    throw new Error(
      `Edge Case: a game needs ${MIN_PLAYERS} to ${MAX_PLAYERS} players, got ${slots.length}`
    );
  }

  if (new Set(slots).size !== slots.length) {
    throw new Error("Edge Case: slots must be unique");
  }

  // `size` counts dots; the state counts boxes.
  const grid = { cols: size - 1, rows: size - 1 };

  return {
    ...grid,
    // Join order. Turn rotation reads this — never `Object.keys(scores)`, whose
    // keys are strings even when the slots are numbers.
    slots: [...slots],
    edges: {
      h: new Array(horizontalEdgeCount(grid)).fill(false),
      v: new Array(verticalEdgeCount(grid)).fill(false),
    },
    owners: new Array(boxCount(grid)).fill(null),
    turn: slots[0],
    scores: Object.fromEntries(slots.map((slot) => [slot, 0])),
    lastMove: null,
    finished: false,
  };
};

/**
 * The same board and players, back at move one — the "play again" button.
 * @param {Object} state - A finished (or abandoned) game state
 * @returns {Object} A fresh game state with the same size and join order
 */
export const resetState = ({ cols, slots }) =>
  createState({ size: cols + 1, slots });
