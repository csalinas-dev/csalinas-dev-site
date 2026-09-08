"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { range } from "lodash";
import styled from "@emotion/styled";

import { landingRow, pieceCount } from "../_lib";
import { playerFor } from "../players";
import { useColumnNavigation } from "../hooks";
import { reload } from "./animations";
import { Column } from "./Column";
import { Piece } from "./Piece";
import { VisuallyHidden } from "../components/VisuallyHidden";

// How long a refusal stays on screen. Long enough to read, short enough that a
// player who meant to press the column next door is not waiting on it. Cleared
// on a timer rather than on `animationend`, because under reduced motion the
// shake never runs and there is no such event to wait for.
const REFUSAL_MS = 900;

const Frame = styled.div`
  /* The panel's inset. The chute above it takes the same one so the piece
     waiting there lines up with the column it is waiting over. */
  --pad: 0.45rem;

  margin: 0 auto;
  max-width: 30rem;
  width: 100%;
`;

const Chute = styled.div`
  padding: 0 var(--pad);
`;

// Exactly one cell tall, and the same width as the columns underneath, so a
// piece in it is already in the position the fall starts from.
const Track = styled.div`
  aspect-ratio: var(--cols) / 1;
  position: relative;
  width: 100%;
`;

// Carries the piece across the board. Transform only, so following the cursor
// costs nothing but a composite.
const Rail = styled.div`
  aspect-ratio: 1 / 1;
  left: 0;
  position: absolute;
  top: 0;
  transform: translateX(calc(var(--col) * 100%));
  transition: transform 150ms cubic-bezier(0.22, 0.61, 0.36, 1);
  width: calc(100% / var(--cols));

  &.blocked {
    opacity: 0.3;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

// The reload sits inside the rail rather than on it: both want the `transform`
// property, and the piece has to be able to arrive and slide across at once.
const Loaded = styled.div`
  animation: ${reload} 200ms ease-out both;
  height: 100%;
  width: 100%;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

// Nothing here may clip: a falling piece spends most of its animation above the
// panel, in the chute's airspace and sometimes above that.
const Surface = styled.div`
  position: relative;
  width: 100%;
`;

const Panel = styled.div`
  background-color: var(--absentBackground);
  border: 1px solid var(--selectionBackground);
  border-radius: 0.75rem;
  display: grid;
  gap: 0;
  grid-template-columns: repeat(var(--cols), 1fr);
  padding: var(--pad);
  /* The board owns the gestures that land on it — a drag across the columns
     must not scroll the page out from under the player. */
  touch-action: manipulation;
  width: 100%;
`;

/**
 * The Connect 404 board.
 *
 * This component owns NO game state. It is handed a state, a cast of players,
 * which slot this device plays and whether that slot may move right now; it
 * hands back the column that was chosen. Everything it keeps to itself is
 * presentation — what the cursor is over, what has focus, which column has just
 * refused a piece.
 *
 * That split is deliberate and load-bearing: the hotseat game passes
 * `youSlot = game.turn`, and an online room (#114) passes the slot that device
 * joined as and sends `onDrop` over the wire. A spectator passes `interactive
 * = false` and a null slot. None of them needs the board to change.
 *
 * The animation is the feature, so it is worth saying what it does *not* do:
 * it does not decide anything. A piece is rendered in the cell the engine put
 * it in before its first frame runs, and every frame of the fall is an offset
 * from that cell ending at zero. If the animation were dropped entirely — as it
 * is under `prefers-reduced-motion` — the board would be in the same place.
 *
 * @param {Object} props
 * @param {Object} props.game - An engine state (see `_lib`)
 * @param {Object[]} props.players - Player descriptors in join order
 * @param {?(String|Number)} [props.youSlot] - The slot this device plays, if any
 * @param {Boolean} props.interactive - Whether this device may move right now
 * @param {Function} props.onDrop - `(col) => void`
 * @param {Boolean} props.showInitials - Stamp each piece with its player's
 *   initial. A per-browser display preference (`src/lib/pieceInitials.js`) that
 *   reaches the chute piece as well as the pieces in the columns.
 * @param {React.ReactNode} [props.overlay] - Rendered over the panel, sized to
 *   it. A "waiting for the other player" curtain (#114) belongs here. The
 *   endgame deliberately does not: the four winning pieces are the point of
 *   winning, and covering them to say so would be a strange thing to do.
 */
export const Board = ({
  game,
  interactive,
  onDrop,
  overlay,
  players,
  showInitials,
  youSlot,
}) => {
  // Hover (mouse) and focus (keyboard) are the same idea — "the column I am
  // about to commit to" — so they feed one preview. Hover wins when both are
  // live, because the hand is the thing that just moved.
  const [hovered, setHovered] = useState(null);
  const [focused, setFocused] = useState(null);

  // A column that has just been asked for a piece it cannot take. `nonce` is
  // what makes the second refusal look like a refusal too.
  const [refused, setRefused] = useState(null);
  const nonce = useRef(0);

  const onActivate = useCallback(
    (col) => {
      if (!interactive) return;

      // Stopped at the tap rather than sent and rejected. The engine refuses a
      // full column too and is still the authority — but online this would be a
      // round trip whose only possible answer is the one already on screen.
      if (landingRow(game, col) === null) {
        nonce.current += 1;
        setRefused({ col, id: nonce.current });
        return;
      }

      setRefused(null);
      onDrop(col);
    },
    [game, interactive, onDrop]
  );

  const { activeColumn: tabColumn, onKeyDown, register } = useColumnNavigation(
    game.cols,
    onActivate
  );

  useEffect(() => {
    if (!refused) return undefined;

    const timer = setTimeout(() => setRefused(null), REFUSAL_MS);
    return () => clearTimeout(timer);
  }, [refused]);

  const onHover = useCallback((col) => setHovered(col), []);
  const onFocus = useCallback((col) => setFocused(col), []);
  const onBlur = useCallback(() => setFocused(null), []);

  const you = useMemo(
    () => (youSlot === null || youSlot === undefined ? null : playerFor(players, youSlot)),
    [players, youSlot]
  );

  // Every move remounts the piece in the chute, which is what replays its
  // arrival. Counting pieces rather than watching `lastMove` because a new game
  // has to reload it too, and a new game has no last move.
  const played = useMemo(() => pieceCount(game), [game]);

  const previewColumn = hovered ?? focused;
  const previewing = interactive && you !== null && previewColumn !== null;
  const previewBlocked =
    previewing && landingRow(game, previewColumn) === null;

  return (
    <Frame style={{ "--cols": game.cols }}>
      {/* Where the piece waits, and where the fall starts from. Decorative: the
          column buttons underneath say the same thing in words. */}
      <Chute aria-hidden="true">
        <Track>
          {previewing && (
            <Rail
              className={previewBlocked ? "blocked" : undefined}
              style={{ "--col": previewColumn }}
            >
              <Loaded key={played}>
                <Piece player={you} showInitials={showInitials} />
              </Loaded>
            </Rail>
          )}
        </Track>
      </Chute>

      <Surface>
        <Panel
          aria-label={`Connect 404 board, ${game.cols} columns by ${game.rows} rows. Use the left and right arrow keys to choose a column and enter to drop a piece.`}
          role="group"
        >
          {range(game.cols).map((col) => (
            <Column
              active={previewColumn === col}
              col={col}
              game={game}
              interactive={interactive}
              key={col}
              landingRow={landingRow(game, col)}
              onActivate={onActivate}
              onBlur={onBlur}
              onFocus={onFocus}
              onHover={onHover}
              onKeyDown={onKeyDown}
              players={players}
              refusedNonce={refused?.col === col ? refused.id : null}
              register={register(col)}
              showInitials={showInitials}
              tabIndex={tabColumn === col ? 0 : -1}
              you={you}
            />
          ))}
        </Panel>

        {overlay}
      </Surface>

      {/* Assertive, and its own region: a refusal interrupts, which is the one
          thing the running commentary must never do. */}
      <VisuallyHidden role="alert">
        {refused ? `Column ${refused.col + 1} is full.` : ""}
      </VisuallyHidden>
    </Frame>
  );
};
