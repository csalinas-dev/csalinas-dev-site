import { memo, useCallback } from "react";
import styled from "@emotion/styled";

import { edgeGeometry, EDGE_STROKE, GHOST_STROKE } from "./geometry";

const Group = styled.g`
  outline: none;

  /* The line the player actually sees. Thin, so the board reads as a lattice
     of dots rather than a slab of colour. The thing you can hit is the
     invisible rect below it, several times this wide. */
  .line {
    stroke-linecap: round;
    transition: stroke 120ms ease-out, stroke-width 120ms ease-out,
      opacity 120ms ease-out;
  }

  .hit {
    fill: transparent;
  }

  &.open .hit {
    cursor: pointer;
  }

  /* The focus ring doubles as the only view of how big the tap target really
     is. Gated on :focus-visible rather than plain focus, because clicking an
     edge focuses it too and a dashed box left behind every mouse click is
     noise. Keyboard focus still previews the move in colour — that is driven by
     React state, not this rule. */
  .ring {
    fill: none;
    opacity: 0;
    stroke: var(--var);
    stroke-dasharray: 6 5;
    stroke-width: 3;
  }

  &:focus-visible .ring {
    opacity: 1;
  }
`;

/**
 * One edge: a faint hint of a line, the line itself once drawn, and a tap
 * target far larger than either.
 *
 * Purely presentational — it is told what it looks like and who to call. It
 * never reads game state, so the same component serves a local game, a
 * networked one and a spectator view.
 */
export const Edge = memo(function Edge({
  grid,
  index,
  interactive,
  label,
  lastColor,
  onActivate,
  onBlur,
  onFocus,
  onHover,
  onKeyDown,
  orientation,
  previewColor,
  register,
  tabIndex,
}) {
  const { x1, y1, x2, y2, hit } = edgeGeometry(grid, orientation, index);
  const drawn = grid.edges[orientation][index];
  const open = interactive && !drawn;

  const handleClick = useCallback(() => {
    if (open) onActivate(orientation, index);
  }, [index, onActivate, open, orientation]);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
        // Space scrolls the page by default, and the board is the page.
        event.preventDefault();
        if (open) onActivate(orientation, index);
        return;
      }

      onKeyDown(event, orientation, index);
    },
    [index, onActivate, onKeyDown, open, orientation]
  );

  // Touch fires pointerenter on tap, which would leave a stale preview stuck
  // under a finger that has already gone. Hover is a mouse idea; keep it there.
  const handleEnter = useCallback(
    (event) => {
      if (event.pointerType === "mouse") onHover(orientation, index);
    },
    [index, onHover, orientation]
  );

  const handleLeave = useCallback(
    (event) => {
      if (event.pointerType === "mouse") onHover(null, null);
    },
    [onHover]
  );

  let stroke = "var(--absentForeground)";
  let width = GHOST_STROKE;
  let opacity = 0.35;

  if (drawn) {
    // Drawn edges are neutral by design: the engine records who closed a BOX,
    // not who drew an edge, and inventing an owner here would put a colour on
    // the board that no rule backs up. The one exception is the move that just
    // happened, which is worth being able to find.
    stroke = lastColor ?? "var(--foreground)";
    width = lastColor ? EDGE_STROKE + 3 : EDGE_STROKE;
    opacity = 1;
  } else if (previewColor) {
    stroke = previewColor;
    width = EDGE_STROKE;
    opacity = 0.6;
  }

  return (
    <Group
      aria-disabled={!open}
      aria-label={label}
      className={open ? "open" : undefined}
      onBlur={onBlur}
      onClick={handleClick}
      onFocus={() => onFocus(orientation, index)}
      onKeyDown={handleKeyDown}
      onPointerEnter={handleEnter}
      onPointerLeave={handleLeave}
      ref={register}
      role="button"
      tabIndex={tabIndex}
    >
      <line
        className="line"
        opacity={opacity}
        stroke={stroke}
        strokeWidth={width}
        x1={x1}
        x2={x2}
        y1={y1}
        y2={y2}
      />
      <rect className="ring" rx="8" {...hit} />
      <rect className="hit" {...hit} />
    </Group>
  );
});
