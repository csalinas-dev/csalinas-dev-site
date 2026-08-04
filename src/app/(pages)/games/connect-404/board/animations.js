import { keyframes } from "@emotion/react";

/**
 * The fall.
 *
 * The piece is already in its final cell in the DOM before a single frame of
 * this runs — every keyframe is an *offset* from where the engine put it, and
 * the last one is zero. That is the whole trick, and it is the reason the
 * animation cannot get the landing wrong: there is no frame in which the piece
 * is anywhere but its own cell, only frames in which it is drawn above it.
 *
 * `--drop` is how many cells up the piece starts, which `Cell` derives from the
 * engine's landing row. Cells are square and stacked with no gap between them,
 * so one cell is exactly 100% of this element's height and the piece leaves
 * from the chute it was previewed in.
 *
 * The first segment eases in like something falling — a quadratic, near enough —
 * and the two after it are the bounce it arrives with.
 */
export const fall = keyframes`
  0% {
    transform: translateY(calc(var(--drop) * -100%));
    animation-timing-function: cubic-bezier(0.45, 0, 0.75, 0.45);
  }
  68% {
    transform: translateY(0);
    animation-timing-function: cubic-bezier(0.3, 0, 0.35, 1);
  }
  81% {
    transform: translateY(-9%);
    animation-timing-function: cubic-bezier(0.6, 0, 0.75, 0.5);
  }
  91% {
    transform: translateY(0);
    animation-timing-function: ease-out;
  }
  96% {
    transform: translateY(-2.5%);
  }
  100% {
    transform: translateY(0);
  }
`;

// Each winning piece swells once, staggered along the line, so the four read as
// a line being drawn rather than four things lighting up at once. The ring that
// marks them is permanent CSS underneath — this only draws the eye to it, and a
// player who arrives after it has finished has lost nothing.
export const pop = keyframes`
  0%   { transform: scale(1); }
  45%  { transform: scale(1.22); }
  100% { transform: scale(1); }
`;

// A column that will not take another piece. Short, sharp and lateral: it reads
// as "no" without looking like part of the game.
export const refuse = keyframes`
  0%, 100% { transform: translateX(0); }
  15%      { transform: translateX(-7%); }
  35%      { transform: translateX(6%); }
  55%      { transform: translateX(-4%); }
  75%      { transform: translateX(2.5%); }
`;

// The next piece arriving in the chute. It replaces one that has just fallen
// out of it, and without this they overlap for a frame and read as two pieces
// in one place.
export const reload = keyframes`
  from { opacity: 0; transform: scale(0.55); }
  to   { opacity: 1; transform: scale(1); }
`;
