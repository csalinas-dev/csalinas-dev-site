"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { range } from "lodash";
import styled from "@emotion/styled";

import { cellCoords, CELLS, SIZE } from "../_lib";
import { opponentOf, playerFor } from "../players";
import { useCellNavigation } from "../hooks";
import { Cell } from "./Cell";
import { MarbleLayer } from "./MarbleLayer";
import { OrbitCaption, OrbitIndicator } from "./OrbitIndicator";
import { VisuallyHidden } from "../components/VisuallyHidden";

// How long a refusal stays on screen. Long enough to read, short enough that a
// player who meant to tap the square next door is not waiting on it. Cleared on
// a timer rather than on `animationend`, because nothing animates.
const REFUSAL_MS = 2200;

const Frame = styled.div`
  /* The panel's inset. The marble layer takes the same one, so its quarters line
     up exactly with the sockets underneath. */
  --pad: 0.75rem;

  margin: 0 auto;
  /* Sized by max-width and an aspect ratio, never by viewport height: a board
     measured in vh or svh is a board that resizes when a mobile browser's
     toolbars retract (see #138). */
  max-width: 26rem;
  width: 100%;
`;

const Surface = styled.div`
  position: relative;
  width: 100%;
`;

const Panel = styled.div`
  aspect-ratio: 1 / 1;
  background-color: var(--absentBackground);
  border: 1px solid var(--selectionBackground);
  border-radius: 0.75rem;
  display: grid;
  gap: 0;
  grid-template-columns: repeat(${SIZE}, 1fr);
  padding: var(--pad);
  /* The board owns the gestures that land on it — a drag across the squares
     must not scroll the page out from under the player. */
  touch-action: manipulation;
  width: 100%;
`;

/**
 * What a square is, and — only when acting on it would do something — what
 * pressing it would do.
 *
 * Rows are counted from the TOP and columns from the left, which is the engine's
 * convention (see `_lib/board.js`). Nothing here mentions gravity: on this board
 * there is none, and every square is as reachable as every other.
 */
const labelFor = ({ col, destination, occupant, placeable, row, selected, source, you, vacated }) => {
  const where = `Row ${row + 1}, column ${col + 1}`;
  const what = occupant ? `${occupant.name}'s marble` : "empty";

  if (selected) return `${where}, ${what}. Selected — choose where to slide it`;
  if (source) return `${where}, ${what}. Move this marble`;
  if (destination) return `${where}, ${what}. Slide the marble here`;
  if (vacated) {
    return `${where}, ${what}. The square your slide emptied. Place ${
      you?.name ?? "your"
    } marble here`;
  }
  if (placeable) return `${where}, ${what}. Place ${you?.name ?? "your"} marble here`;

  return `${where}, ${what}`;
};

/**
 * The Race Condition board.
 *
 * This component owns NO game state. It is handed a position to draw, the marble
 * ids that go with it, the staged turn, and whether this device may act; it
 * hands back the square that was chosen. Everything it keeps to itself is
 * presentation — what has focus, and what has just refused a tap.
 *
 * The split is deliberate and load-bearing: the hotseat game passes
 * `youSlot = game.turn`, and an online room (#144) passes the seat that device
 * joined as and sends `onCellActivate` over the wire. A spectator passes
 * `interactive = false` and a null slot. None of them needs the board to change.
 *
 * The `cells` it draws are NOT necessarily `game.cells` — they are whichever
 * frame of the turn is on screen, which mid-orbit is a position the engine
 * passed through. That is the whole point of the animation, and it is safe
 * precisely because this component cannot decide anything about it.
 *
 * @param {Object} props
 * @param {(String|Number|null)[]} props.cells - The position to draw
 * @param {(Number|null)[]} props.ids - One marble id per square
 * @param {Object[]} props.players - Player descriptors in join order
 * @param {?(String|Number)} props.youSlot - The seat this device plays, if any
 * @param {Boolean} props.interactive - Whether it may act right now
 * @param {Object} props.draft - The staged turn, from `useTurnDraft`
 * @param {Boolean} props.spinning - A press sequence is running
 * @param {Number} props.spin - Which press is on screen
 * @param {Number} props.spins - How many presses this turn has
 * @param {Number} props.spinMs - How long the current move should take
 * @param {Function} props.onCellActivate - `(index) => void`
 * @param {?Set<Number>} [props.winningCells] - Squares in a completed line
 * @param {Number[]} [props.winningOrder] - Those squares, in stagger order
 * @param {Boolean} [props.decided] - The game is over
 * @param {React.ReactNode} [props.overlay] - Rendered over the panel, sized to
 *   it. A "waiting for the other player" curtain (#144) belongs here. The
 *   endgame deliberately does not: the winning line is the point of winning, and
 *   covering it to say so would be a strange thing to do.
 */
export const Board = ({
  cells,
  decided,
  draft,
  ids,
  interactive,
  onCellActivate,
  overlay,
  players,
  spin,
  spinMs,
  spinning,
  spins,
  winningCells,
  winningOrder,
  youSlot,
}) => {
  const [refused, setRefused] = useState(null);
  const nonce = useRef(0);

  const { activeCell, onKeyDown, register } = useCellNavigation();

  const you = useMemo(
    () =>
      youSlot === null || youSlot === undefined ? null : playerFor(players, youSlot),
    [players, youSlot]
  );

  const opponent = useMemo(
    () => (youSlot === null || youSlot === undefined ? null : opponentOf(players, youSlot)),
    [players, youSlot]
  );

  const onActivate = useCallback(
    (index) => {
      // Stopped at the tap rather than sent and refused. The engine is still the
      // authority — but the draft only ever offers squares `legalMoves` and
      // `emptyCells` named, so anything else has no turn to send.
      const inert =
        interactive &&
        cells[index] != null &&
        index !== draft.source &&
        !draft.sources.has(index) &&
        !(draft.move !== null && draft.move.to === index);

      if (inert) {
        nonce.current += 1;
        setRefused({ index, id: nonce.current });

        return;
      }

      setRefused(null);
      onCellActivate(index);
    },
    [cells, draft, interactive, onCellActivate]
  );

  useEffect(() => {
    if (!refused) return undefined;

    const timer = setTimeout(() => setRefused(null), REFUSAL_MS);

    return () => clearTimeout(timer);
  }, [refused]);

  return (
    <Frame>
      <Surface>
        <Panel
          aria-label={`Race Condition board, ${SIZE} by ${SIZE}. Use the arrow keys to move between squares and enter to act on one. Rows are counted from the top.`}
          role="group"
          style={{ "--spin": `${spinMs}ms` }}
        >
          {range(CELLS).map((index) => {
            const { row, col } = cellCoords(index);
            const occupant =
              cells[index] == null ? null : playerFor(players, cells[index]);
            const source = interactive && draft.sources.has(index);
            const selected = interactive && draft.source === index;
            const destination = interactive && draft.destinations.has(index);
            const placeable = interactive && draft.placeable.has(index);

            return (
              <Cell
                col={col}
                destination={destination}
                index={index}
                key={index}
                label={labelFor({
                  col,
                  destination,
                  occupant,
                  placeable,
                  row,
                  selected,
                  source,
                  vacated: placeable && draft.move?.from === index,
                  you,
                })}
                onActivate={onActivate}
                onKeyDown={onKeyDown}
                placeable={placeable}
                register={register(index)}
                row={row}
                selected={selected}
                source={source}
                tabIndex={activeCell === index ? 0 : -1}
                vacated={placeable && draft.move?.from === index}
                winning={winningCells?.has(index) ?? false}
              />
            );
          })}
        </Panel>

        <MarbleLayer
          cells={cells}
          decided={decided}
          ids={ids}
          players={players}
          winningCells={winningCells}
          winningOrder={winningOrder}
        />

        <OrbitIndicator spin={spin} spinning={spinning} spins={spins} />

        {overlay}
      </Surface>

      {/* Outside the surface, because the surface is the panel's box and the
          chevrons are pinned to its edges. */}
      <OrbitCaption spin={spin} spinning={spinning} spins={spins} />

      {/* Assertive, and its own region: a refusal interrupts, which is the one
          thing the running commentary must never do. */}
      <VisuallyHidden role="alert">
        {refused
          ? `That marble cannot be slid this turn. You may only slide ${
              opponent?.name ?? "your opponent"
            }'s marbles, and only onto an empty square beside one.`
          : ""}
      </VisuallyHidden>
    </Frame>
  );
};
