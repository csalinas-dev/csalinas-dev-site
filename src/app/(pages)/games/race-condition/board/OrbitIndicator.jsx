import styled from "@emotion/styled";

import { press as flash } from "./animations";

// The four sides of the board, in the outer track's TRAVEL ORDER — down the left
// column, right along the bottom, up the right column, left along the top. That
// order is the counter-clockwise direction the engine turns, and the rotation of
// each chevron is the direction that side moves in.
//
// `rotate` is applied to an arrow drawn pointing UP.
const SIDES = Object.freeze([
  { key: "left", rotate: 180, style: { left: 0, top: "50%" } },
  { key: "bottom", rotate: 90, style: { bottom: 0, left: "50%" } },
  { key: "right", rotate: 0, style: { right: 0, top: "50%" } },
  { key: "top", rotate: 270, style: { left: "50%", top: 0 } },
]);

const Chevrons = styled.div`
  inset: 0;
  pointer-events: none;
  position: absolute;

  /* The positioner owns transform — the placement and the rotation — so the
     flash below can own it on the element inside. One element cannot hold both,
     and a keyframe that took the property would drop the rotation with it. */
  .chevron {
    color: var(--absentForeground);
    height: 0.9rem;
    position: absolute;
    width: 0.9rem;
  }

  svg {
    display: block;
    height: 100%;
    opacity: 0.45;
    width: 100%;
  }

  &.pressing svg {
    animation: ${flash} 420ms ease-out both;
  }

  @media (prefers-reduced-motion: reduce) {
    &.pressing svg {
      animation: none;
    }
  }
`;

const Caption = styled.div`
  color: var(--absentForeground);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  line-height: 1rem;
  padding-top: 0.35rem;
  text-align: center;
  text-transform: uppercase;

  &.pressing {
    color: var(--var);
  }
`;

/**
 * Which way the board turns.
 *
 * There is no Orbito button to press here: the press is part of the turn and the
 * engine applies it, so this is where a player learns that the board turns at
 * all and — the expensive fact — which way. The chevrons sit on the four sides
 * pointing the way that side travels, and flash in travel order once per press.
 *
 * ABSOLUTE, and it must be positioned against the PANEL rather than anything
 * taller: a chevron pinned to the bottom of a box that also contains the caption
 * ends up next to the caption instead of on the board's bottom edge. `Board`
 * renders this inside the panel's own positioning context and `OrbitCaption`
 * outside it, which is why they are two components and not one.
 *
 * Decorative, and `aria-hidden`: the announcer says all of it in words.
 *
 * @param {Object} props
 * @param {Boolean} props.spinning - A sequence is running
 * @param {Number} props.spin - Which press is on screen, 0 for the pre-orbit hold
 * @param {Number} props.spins - How many presses this turn has
 */
export const OrbitIndicator = ({ spin, spinning, spins }) => {
  const pressing = spinning && spin > 0;

  return (
    <>
      {/* Keyed on the press so the flash replays for each one rather than only
          for the first — a remount is the only thing that restarts a CSS
          animation. */}
      <Chevrons
        aria-hidden="true"
        className={pressing ? "pressing" : undefined}
        key={`${spins}-${spin}`}
      >
        {SIDES.map(({ key, rotate, style }, order) => (
          <span
            className="chevron"
            key={key}
            style={{
              ...style,
              transform: `translate(${style.left === "50%" ? "-50%" : "0"}, ${
                style.top === "50%" ? "-50%" : "0"
              }) rotate(${rotate}deg)`,
            }}
          >
            {/* Staggered in travel order, so the flash reads as one lap of the
                board rather than four lights coming on together. */}
            <svg
              style={{ animationDelay: `${order * 60}ms` }}
              viewBox="0 0 12 12"
            >
              <path
                d="M2 8 L6 4 L10 8"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </span>
        ))}
      </Chevrons>
    </>
  );
};

/**
 * The label under the board: "Orbit" at rest, and the press counter while a
 * sequence is running.
 *
 * The counter only appears when there is more than one press to count — a turn
 * presses once, and "Press 1 of 1" would be telling a player something they can
 * see. Overtime is the case worth narrating: up to six presses in a row, on a
 * board nobody may touch.
 *
 * @param {Object} props
 * @param {Boolean} props.spinning - A sequence is running
 * @param {Number} props.spin - Which press is on screen
 * @param {Number} props.spins - How many presses this turn has
 */
export const OrbitCaption = ({ spin, spinning, spins }) => (
  <Caption
    aria-hidden="true"
    className={spinning && spin > 0 ? "pressing" : undefined}
  >
    {spinning && spins > 1 ? `Press ${Math.max(spin, 1)} of ${spins}` : "Orbit"}
  </Caption>
);
