import styled from "@emotion/styled";

import { land, pop } from "./animations";

// The positioner. Exactly one QUARTER of the marble layer in each direction, so
// `translate(calc(var(--col) * 100%), calc(var(--row) * 100%))` moves it by
// exactly one square — the same technique Connect 404's rail uses to follow the
// cursor across the columns.
//
// The transition is the orbit. The computed value of `transform` changes when
// the custom properties do, and the browser interpolates it; every step of both
// orbit tracks is one orthogonally adjacent square, so that interpolation is a
// straight line between two squares and never cuts a corner.
//
// `--spin` is set by the board, per press: the first press of a turn is the one
// being taught and the overtime presses are the ones being sat through.
const Positioner = styled.div`
  height: 25%;
  inset: 0;
  position: absolute;
  transform: translate(calc(var(--col) * 100%), calc(var(--row) * 100%));
  transition: transform var(--spin, 460ms) cubic-bezier(0.34, 0.05, 0.25, 1);
  width: 25%;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

// Everything that scales lives inside the positioner rather than on it: both
// want `transform`, and a marble has to be able to arrive and travel at once.
//
// The arrival runs on MOUNT and needs no prop to say so. A marble keeps its id —
// and therefore its DOM node — all the way round the board, so the only marble
// that mounts on a turn is the one that was just placed.
const Disc = styled.div`
  animation: ${land} 260ms ease-out both;
  height: 100%;
  padding: 6%;
  transition: opacity 400ms ease-out 500ms;
  width: 100%;

  &.winning {
    animation:
      ${land} 260ms ease-out both,
      ${pop} 620ms ease-out var(--delay) both;
    filter: drop-shadow(0 0 0.4rem var(--slot));
  }

  /* Everything that is not part of the winning line steps back so the line can
     step forward. Never below the point of being readable. */
  &.dimmed {
    opacity: 0.4;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transition: none;

    &.winning {
      animation: none;
    }
  }
`;

// SVG rather than a text node so the initial scales with the board instead of
// with the root font size: the same markup has to look right in a 6rem square on
// a desktop and a 60px one on a phone.
const Glyph = styled.svg`
  display: block;
  height: 100%;
  width: 100%;

  text {
    fill: var(--background);
    font-family: inherit;
    font-weight: 700;
  }
`;

/** Marble units, inside the padded disc. */
const MARBLE_RADIUS = 9.2;

/**
 * One marble, on the square the engine put it on.
 *
 * It decides nothing — not where it is, not whether it moved, not whether it is
 * part of a winning line. It is told a row and a column and it draws itself
 * there; the fact that it slides rather than jumps is the browser interpolating
 * a transform between two renders, not this component knowing anything about the
 * orbit.
 *
 * The initial is not decoration. Cyan and gold is the kindest two-colour pair
 * for the common colour-vision deficiencies, but the site's rule is that colour
 * never carries a fact on its own — and on a board where sixteen marbles sit
 * shoulder to shoulder and all of them move at once, "which of these is mine" is
 * the only fact there is.
 *
 * @param {Object} props
 * @param {Object} props.player - A player descriptor from `players.js`
 * @param {Number} props.row - Row 0 is the TOP (the engine's convention)
 * @param {Number} props.col - Column 0 is the LEFT
 * @param {Number} props.winIndex - Its place along the winning line, or -1
 * @param {Boolean} props.dimmed - The game is decided and this is not part of it
 */
export const Marble = ({ col, dimmed, player, row, winIndex }) => {
  const winning = winIndex >= 0;

  return (
    <Positioner style={{ "--row": row, "--col": col }}>
      <Disc
        className={
          [winning && "winning", dimmed && "dimmed"].filter(Boolean).join(" ") ||
          undefined
        }
        style={{
          // Staggered along the line, and held back long enough that the orbit
          // that produced it has finished before its own marble swells.
          "--delay": winning ? `${240 + winIndex * 110}ms` : undefined,
          "--slot": player.color,
        }}
      >
        <Glyph aria-hidden="true" viewBox="0 0 20 20">
          <circle
            cx="10"
            cy="10"
            fill={player.color}
            r={MARBLE_RADIUS}
            /* A rim rather than a shadow: it survives the marble being drawn
               over an empty socket mid-orbit, which a drop shadow does not. */
            stroke="rgba(0, 0, 0, 0.32)"
            strokeWidth="0.7"
          />
          <text
            dominantBaseline="central"
            fontSize="9"
            textAnchor="middle"
            x="10"
            y="10.4"
          >
            {player.initial}
          </text>
        </Glyph>
      </Disc>
    </Positioner>
  );
};
