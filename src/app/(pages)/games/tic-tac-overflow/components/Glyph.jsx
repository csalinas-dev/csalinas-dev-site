import styled from "@emotion/styled";

import Mark from "../Mark";

const Svg = styled.svg`
  /* The glyph must never be what decides how tall a cell is. Its block size
     comes from its own 1:1 ratio and never from a percentage of the parent:
     iOS Safari resolves a percentage height against the *border* box of a box
     sized by aspect-ratio, so height 100% inside Cell's 14% padding came back a
     whole padding-box too tall and stretched the grid row it was sitting in.
     Only width may be a percentage here — the inline axis resolves against a
     definite size and every engine agrees on it. */
  aspect-ratio: 1 / 1;
  display: block;
  height: auto;
  overflow: visible;
  width: 100%;

  &.X {
    color: var(--component);
  }

  &.O {
    color: var(--string);
  }
`;

export const Glyph = ({ mark }) => (
  <Svg
    aria-hidden="true"
    className={mark}
    fill="none"
    focusable="false"
    stroke="currentColor"
    strokeLinecap="round"
    strokeWidth="12"
    viewBox="0 0 100 100"
  >
    {mark === Mark.X ? (
      <>
        <line x1="14" y1="14" x2="86" y2="86" />
        <line x1="86" y1="14" x2="14" y2="86" />
      </>
    ) : (
      <circle cx="50" cy="50" r="36" />
    )}
  </Svg>
);
