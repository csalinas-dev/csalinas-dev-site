import { keyframes } from "@emotion/react";

/**
 * Race Condition — the keyframes.
 *
 * The orbit itself is NOT here. It is a `transition: transform` on the marble,
 * driven by the cell it is drawn in changing, because a marble has to be able to
 * travel from wherever it is to wherever the engine put it — and a keyframe
 * animation would have to know both ends in advance.
 *
 * What is here is everything around the orbit, and none of it decides anything:
 * each one starts and ends on the element's own square, so dropping every one of
 * them (as `prefers-reduced-motion: reduce` does) leaves the board in exactly the
 * same place.
 */

// The placed marble arriving. It is already in its own cell before the first
// frame runs — this only draws it small and faint on the way in, so the eye
// catches which of sixteen marbles is the new one.
export const land = keyframes`
  from { opacity: 0; transform: scale(0.4); }
  to   { opacity: 1; transform: scale(1); }
`;

// Each winning marble swells once, staggered along the line, so the four read as
// a line being drawn rather than four things lighting up at once. The ring that
// marks them is permanent CSS underneath — this only draws the eye to it, and a
// player who arrives after it has finished has lost nothing.
export const pop = keyframes`
  0%   { transform: scale(1); }
  45%  { transform: scale(1.2); }
  100% { transform: scale(1); }
`;

// A cell that is offering something: an opponent marble you may slide, a square
// it may slide to, a square you may place on.
//
// A BOX-SHADOW PULSE ON THE CELL, never a transform on the marble. The marble's
// `transform` belongs to the orbit and the two cannot share the property — a
// highlight that borrowed it would fight the rotation and the marble would jump.
export const beckon = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 var(--beckon); }
  50%      { box-shadow: 0 0 0 0.28rem var(--beckon); }
`;

// The orbit indicator's chevrons, one flash per press. Purely a read-out of
// something that has already happened.
export const press = keyframes`
  0%   { opacity: 0.25; transform: scale(1); }
  35%  { opacity: 1; transform: scale(1.25); }
  100% { opacity: 0.25; transform: scale(1); }
`;
