import { memo } from "react";
import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";

import { boxGeometry, CELL } from "./geometry";

const claim = keyframes`
  from { opacity: 0; transform: scale(0.55); }
  to   { opacity: 1; transform: scale(1); }
`;

const Group = styled.g`
  /* Boxes are scenery — every pointer that lands on one is aimed at an edge. */
  pointer-events: none;

  &.fresh {
    animation: ${claim} 220ms ease-out both;
    transform-box: fill-box;
    transform-origin: center;
  }

  .initial {
    dominant-baseline: central;
    font-size: ${CELL * 0.44}px;
    font-weight: 700;
    text-anchor: middle;
    user-select: none;
  }
`;

/**
 * A claimed box: the owner's colour, and the owner's initial.
 *
 * The initial is not decoration. Blue/purple and orange/green are the pairs
 * people confuse, and a board that answers "whose is that?" in colour alone is
 * unreadable for a good number of players. The letter is the redundant channel
 * that makes the colour safe.
 *
 * The fill is deliberately translucent and the letter full strength: a solid
 * block of any of the four palette colours drowns out the edges crossing it,
 * and the contrast a letter needs is easier to win against the page background.
 */
export const Box = memo(function Box({ fresh, grid, index, label, player }) {
  const { x, y, width, height, cx, cy } = boxGeometry(grid, index);

  return (
    <Group
      aria-label={label}
      className={fresh ? "fresh" : undefined}
      role="img"
    >
      <rect
        fill={player.color}
        height={height}
        opacity="0.28"
        width={width}
        x={x}
        y={y}
      />
      <text aria-hidden="true" className="initial" fill={player.color} x={cx} y={cy}>
        {player.initial}
      </text>
    </Group>
  );
});
