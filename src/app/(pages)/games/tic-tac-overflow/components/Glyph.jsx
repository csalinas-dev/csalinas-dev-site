import styled from "@emotion/styled";

import Mark from "../Mark";

const Svg = styled.svg`
  height: 100%;
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
