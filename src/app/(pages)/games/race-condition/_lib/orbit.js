/**
 * Race Condition — the orbit.
 *
 * ┌───────────────────────────────────────────────────────────────────────────┐
 * │ ORBIT CONVENTION — read this before animating or re-implementing          │
 * │ anything. Getting the DIRECTION backwards is the highest-value bug in     │
 * │ this game and the hardest to see: a mirrored board still plays a          │
 * │ perfectly legal-looking game. Do not re-derive it.                        │
 * └───────────────────────────────────────────────────────────────────────────┘
 *
 * The rulebook: "TO FINISH YOUR TURN, YOU MUST PRESS THE ORBITO-BUTTON! This
 * will cause ALL marbles to shift 1 position on the board! Both the inner &
 * outer orbits rotate counter-clockwise."
 *
 * TWO ORBITS, both turning COUNTER-CLOCKWISE by exactly one position per press.
 * EMPTY SQUARES TRAVEL TOO — a press is a permutation of all 16 squares, not a
 * shuffle of the occupied ones. That is why `orbit` takes and returns a whole
 * board rather than a list of marbles.
 *
 *   OUTER — the 12 border squares, in TRAVEL ORDER. The marble on each entry
 *   moves to the NEXT entry, and the last wraps back to the first:
 *
 *       [0, 4, 8, 12, 13, 14, 15, 11, 7, 3, 2, 1]
 *
 *       down the left column, right along the bottom, up the right column,
 *       left along the top — which is what counter-clockwise means with row 0
 *       on TOP (see the indexing convention in `board.js`).
 *
 *   INNER — the 4 centre squares, same walk on the 2x2 middle, same direction:
 *
 *       [5, 9, 10, 6]
 *
 * One press, drawn — the letters are marbles, not slots:
 *
 *       A B C D                B C D H
 *       E F G H      ──▶       A G K L
 *       I J K L                E F J P
 *       M N O P                I M N O
 *
 * Both tracks are DERIVED below by walking the grid, not pasted in as
 * literals — `.agent/scripts/verify-race-condition.mjs` asserts the derivation
 * equals the arrays above, so the numbers in this comment are checked rather
 * than trusted. It also checks that the tracks are disjoint and cover all 16
 * squares, that a specific table of moves (0→4, 3→2, 12→13, 15→11, 5→9, 6→5)
 * holds, and that every outer square returns to its start after exactly 12
 * presses and every inner square after 4 — so the whole board repeats after 12
 * presses and not before.
 *
 * Nothing here mutates: `orbit` and `unorbit` both return a NEW array.
 */

import { CELLS, SIZE } from "./constants";
import { cellIndex } from "./board";

/**
 * One counter-clockwise ring of the grid, in travel order.
 *
 * `inset` 0 is the border, 1 is the 2x2 centre — the same walk either way, on a
 * smaller square. Written as a walk rather than a table so that the direction is
 * stated once, in code that can be read against the diagram above.
 *
 * @param {Number} inset - How many rings in from the edge, 0-based
 * @returns {Number[]} Flat cell indices in travel order
 */
const ringTrack = (inset) => {
  const lo = inset;
  const hi = SIZE - 1 - inset;
  const track = [];

  // Down the left column, top to bottom.
  for (let row = lo; row <= hi; row += 1) track.push(cellIndex(row, lo));
  // Right along the bottom row.
  for (let col = lo + 1; col <= hi; col += 1) track.push(cellIndex(hi, col));
  // Up the right column, bottom to top.
  for (let row = hi - 1; row >= lo; row -= 1) track.push(cellIndex(row, hi));
  // Left along the top row, stopping short of the corner we started on.
  for (let col = hi - 1; col > lo; col -= 1) track.push(cellIndex(lo, col));

  return track;
};

/** The 12 border squares, counter-clockwise. */
export const OUTER_TRACK = Object.freeze(ringTrack(0));

/** The 4 centre squares, counter-clockwise. */
export const INNER_TRACK = Object.freeze(ringTrack(1));

/** Both tracks, outer first — everything a press touches, which is everything. */
export const TRACKS = Object.freeze([OUTER_TRACK, INNER_TRACK]);

/**
 * One press, flattened: `ORBIT_TO[i]` is where the marble on square `i` ends up.
 *
 * Collapsing the two tracks into a single 16-entry permutation means a press is
 * one pass over the board with no branch on which ring a square belongs to, and
 * it makes "the tracks cover every square exactly once" checkable — a gap would
 * leave a hole in this array.
 */
export const ORBIT_TO = Object.freeze(
  TRACKS.reduce(
    (destinations, track) => {
      track.forEach((from, position) => {
        destinations[from] = track[(position + 1) % track.length];
      });

      return destinations;
    },
    new Array(CELLS).fill(null)
  )
);

/**
 * Press the Orbito button once.
 *
 * @param {(String|Number|null)[]} cells - The board
 * @returns {(String|Number|null)[]} A NEW board, one position further round
 */
export const orbit = (cells) => {
  const next = new Array(CELLS).fill(null);

  for (let index = 0; index < CELLS; index += 1) {
    next[ORBIT_TO[index]] = cells[index] ?? null;
  }

  return next;
};

/**
 * The inverse of one press — the board as it was before it.
 *
 * Nothing in the rules runs backwards; this exists so a renderer can step an
 * animation in either direction and so the verify script can check `orbit`
 * against something other than itself.
 *
 * @param {(String|Number|null)[]} cells - The board
 * @returns {(String|Number|null)[]} A NEW board, one position back round
 */
export const unorbit = (cells) => {
  const previous = new Array(CELLS).fill(null);

  for (let index = 0; index < CELLS; index += 1) {
    previous[index] = cells[ORBIT_TO[index]] ?? null;
  }

  return previous;
};
