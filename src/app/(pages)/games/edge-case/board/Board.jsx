"use client";

import { useCallback, useMemo, useState } from "react";
import styled from "@emotion/styled";
import { range } from "lodash";

import {
  edgeKey,
  horizontalEdgeCount,
  Orientation,
  verticalEdgeCount,
} from "../_lib";
import { playerFor } from "../players";
import { useEdgeNavigation, useZoomPan } from "../hooks";
import { Box } from "./Box";
import { Edge } from "./Edge";
import { ZoomControls } from "./ZoomControls";
import {
  describeBox,
  describeEdge,
  dotX,
  dotY,
  DOT_RADIUS,
  viewBox,
} from "./geometry";

const Frame = styled.div`
  width: 100%;
`;

// Wraps the board and nothing else, so anything handed in as `overlay` covers
// exactly the board — not the zoom controls under it.
const Surface = styled.div`
  position: relative;
  width: 100%;
`;

const Viewport = styled.div`
  aspect-ratio: 1 / 1;
  background-color: var(--absentBackground);
  border-radius: 0.75rem;
  overflow: hidden;
  position: relative;
  /* The board owns every gesture that lands on it — the browser must not steal
     a pinch to zoom the document or a drag to scroll the page. */
  touch-action: none;
  width: 100%;

  &.zoomed {
    cursor: grab;
  }

  &.panning {
    cursor: grabbing;
  }
`;

// The element the zoom/pan transform is applied to. Transforming here rather
// than rewriting the viewBox means the browser keeps mapping pointer
// coordinates for us, so hit targets survive zooming untouched.
const Stage = styled.div`
  height: 100%;
  transform-origin: 0 0;
  width: 100%;

  > svg {
    display: block;
    height: 100%;
    width: 100%;
  }
`;

/**
 * The Edge Case board.
 *
 * This component owns NO game state. It is handed a state, a cast of players,
 * which slot this device is playing, and whether that slot may move right now;
 * it hands back the edge that was chosen. Everything it keeps to itself is
 * presentation — what the cursor is over, what has focus, how far it is zoomed
 * in.
 *
 * That split is deliberate and load-bearing: the local hotseat game passes
 * `youSlot = game.turn`, and a networked room (#94) passes the slot that
 * device joined as and drives `onDraw` over the wire. Neither needs the board
 * to change.
 *
 * SVG rather than DOM elements, because the board is one coordinate system with
 * three overlapping layers of geometry — box fills, thin lines, and tap targets
 * five times their width — and only SVG lets those be sized independently of
 * each other while scaling as one under zoom.
 *
 * @param {Object} props
 * @param {Object} props.game - An engine state (see `_lib`)
 * @param {Object[]} props.players - Player descriptors in join order
 * @param {String|Number} [props.youSlot] - The slot this device plays, if any
 * @param {Boolean} props.interactive - Whether this device may move right now
 * @param {Function} props.onDraw - `({ orientation, index }) => void`
 * @param {React.ReactNode} [props.overlay] - Rendered over the board, sized to
 *   it. The endgame animation (#95) mounts here; a "waiting for the host"
 *   curtain (#94) would too.
 */
export const Board = ({
  game,
  interactive,
  onDraw,
  overlay,
  players,
  youSlot,
}) => {
  const { activeKey, onKeyDown, register } = useEdgeNavigation(game);
  const {
    canZoomIn,
    canZoomOut,
    panning,
    reset,
    transform,
    viewportProps,
    zoomIn,
    zoomOut,
  } = useZoomPan();

  // Hover (mouse) and focus (keyboard) are the same idea — "the edge I am
  // about to commit to" — so they feed one preview. Hover wins when both are
  // live, because the hand is the thing that just moved.
  const [hovered, setHovered] = useState(null);
  const [focused, setFocused] = useState(null);

  const onHover = useCallback(
    (orientation, index) =>
      setHovered(orientation === null ? null : edgeKey(orientation, index)),
    []
  );
  const onFocus = useCallback(
    (orientation, index) => setFocused(edgeKey(orientation, index)),
    []
  );
  const onBlur = useCallback(() => setFocused(null), []);

  const onActivate = useCallback(
    (orientation, index) => onDraw({ orientation, index }),
    [onDraw]
  );

  const you = useMemo(() => playerFor(players, youSlot), [players, youSlot]);
  const previewKey = hovered ?? focused;

  // The colour of the edge that closed the last box, so a player can find the
  // move that just happened on a board full of identical grey lines.
  const lastColor = game.lastMove
    ? playerFor(players, game.lastMove.slot).color
    : null;
  const lastKey = game.lastMove
    ? edgeKey(game.lastMove.type, game.lastMove.index)
    : null;

  const claimedNow = useMemo(
    () => new Set(game.lastMove?.claimed ?? []),
    [game.lastMove]
  );

  const renderEdges = (orientation, count) =>
    range(count).map((index) => {
      const key = edgeKey(orientation, index);
      const drawn = game.edges[orientation][index];
      const open = interactive && !drawn;
      const where = describeEdge(game, orientation, index);

      return (
        <Edge
          grid={game}
          index={index}
          interactive={interactive}
          key={key}
          label={`${where}, ${drawn ? "drawn" : "open"}${
            open ? `. Claim for ${you.name}` : ""
          }`}
          lastColor={key === lastKey ? lastColor : null}
          onActivate={onActivate}
          onBlur={onBlur}
          onFocus={onFocus}
          onHover={onHover}
          onKeyDown={onKeyDown}
          orientation={orientation}
          previewColor={open && previewKey === key ? you.color : null}
          register={register(key)}
          tabIndex={activeKey === key ? 0 : -1}
        />
      );
    });

  return (
    <Frame>
      <Surface>
      <Viewport
        {...viewportProps}
        className={[transform.scale > 1 && "zoomed", panning && "panning"]
          .filter(Boolean)
          .join(" ")}
      >
        <Stage
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          }}
        >
          <svg
            aria-label={`Edge Case board, ${game.cols} by ${game.rows} boxes. Use the arrow keys to move between edges and enter to claim one.`}
            role="group"
            viewBox={viewBox(game)}
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Bottom layer: who owns what. */}
            <g>
              {game.owners.map((slot, index) =>
                slot === null ? null : (
                  <Box
                    fresh={claimedNow.has(index)}
                    grid={game}
                    index={index}
                    key={index}
                    label={`${describeBox(game, index)}, claimed by ${
                      playerFor(players, slot).name
                    }`}
                    player={playerFor(players, slot)}
                  />
                )
              )}
            </g>

            {/* Middle layer: the lines, and the targets over them. */}
            <g>
              {renderEdges(Orientation.Horizontal, horizontalEdgeCount(game))}
              {renderEdges(Orientation.Vertical, verticalEdgeCount(game))}
            </g>

            {/* Top layer: the dots. Decorative, and never in the way of a tap. */}
            <g fill="var(--absentForeground)" pointerEvents="none">
              {range(game.rows + 1).map((row) =>
                range(game.cols + 1).map((col) => (
                  <circle
                    cx={dotX(col)}
                    cy={dotY(row)}
                    key={`${row}-${col}`}
                    r={DOT_RADIUS}
                  />
                ))
              )}
            </g>
          </svg>
        </Stage>
      </Viewport>
        {overlay}
      </Surface>

      <ZoomControls
        canZoomIn={canZoomIn}
        canZoomOut={canZoomOut}
        onReset={reset}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        scale={transform.scale}
      />
    </Frame>
  );
};
