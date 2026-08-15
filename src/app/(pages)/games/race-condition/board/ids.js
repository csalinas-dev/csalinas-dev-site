/**
 * Marble identity — PRESENTATION ONLY. There are no rules in this file.
 *
 * A marble in the engine is nothing but its owner's slot at an index, which is
 * everything the rules need and not enough to animate: when the board orbits,
 * every square's contents change, and React — keyed on the index — would tear
 * down sixteen nodes and build sixteen more. Nothing would move; the board would
 * repaint one position further round.
 *
 * So a parallel 16-entry array of synthetic ids rides alongside `cells`, and the
 * marble layer keys on it. The same id in a different square is the same DOM
 * node in a different place, which is what `transition: transform` needs to have
 * something to interpolate.
 *
 * If this file were deleted the board would be in exactly the same place — only
 * the trip between two positions would be missing. It decides nothing: the
 * permutation below is `ORBIT_TO` from `_lib`, not a rotation worked out here,
 * because a renderer that turns the board the other way still plays a
 * legal-looking game and only the marbles disagreeing with `state.cells` at the
 * end of a sequence would say so.
 */

import { CELLS, ORBIT_TO } from "../_lib";

/** No marbles anywhere — the ids for a fresh board. */
export const emptyIds = () => new Array(CELLS).fill(null);

/**
 * One press, applied to the ids.
 *
 * The SAME permutation `_lib/orbit` applies to the cells, taken from the same
 * table. Do not hand-roll the ring walk here; that is the bug this comment
 * exists for.
 *
 * @param {(Number|null)[]} ids - One id per square, or null where it is empty
 * @returns {(Number|null)[]} A NEW array, one position further round
 */
export const orbitIds = (ids) => {
  const next = emptyIds();

  for (let index = 0; index < CELLS; index += 1) {
    next[ORBIT_TO[index]] = ids[index] ?? null;
  }

  return next;
};

/**
 * A slide, applied to the ids — the mirror of `_lib/applyMove`.
 *
 * @param {(Number|null)[]} ids - One id per square
 * @param {?{from: Number, to: Number}} move - The slide, or null
 * @returns {(Number|null)[]} A NEW array, or `ids` BY REFERENCE when the move is
 *   declined, matching the engine's "nothing happened" identity
 */
export const applyMoveToIds = (ids, move) => {
  if (move == null) return ids;

  const next = [...ids];
  next[move.to] = next[move.from];
  next[move.from] = null;

  return next;
};
