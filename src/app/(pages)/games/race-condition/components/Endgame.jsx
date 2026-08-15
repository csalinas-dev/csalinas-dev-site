"use client";

import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";

import { DrawReason } from "../_lib";

const reveal = keyframes`
  from { opacity: 0; transform: translateY(-0.3rem); }
  to   { opacity: 1; transform: translateY(0); }
`;

// Under the board, not over it. The completed line is what winning looks like,
// and a panel that covered it to announce the win would be announcing something
// the player can no longer see.
const Panel = styled.div`
  align-items: center;
  animation: ${reveal} 300ms ease-out 620ms both;
  background-color: var(--absentBackground);
  border-radius: 0.6rem;
  display: flex;
  flex-flow: row wrap;
  gap: 0.75rem;
  justify-content: space-between;
  padding: 0.75rem 0.9rem;
  width: 100%;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Verdict = styled.div`
  /* Shrinks rather than pushing the button onto a line of its own. It wraps
     eventually, on a narrow phone, which is the width it should wrap at. */
  flex: 1 1 10rem;
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.5rem;
  min-width: 0;

  .slot {
    color: var(--slot);
  }

  small {
    color: var(--absentForeground);
    display: block;
    font-size: 0.8rem;
    font-weight: 400;
    line-height: 1.05rem;
  }
`;

const Again = styled.button`
  background-color: var(--selectionBackground);
  border: 1px solid var(--component);
  border-radius: 0.4rem;
  color: var(--component);
  cursor: pointer;
  flex: 0 0 auto;
  font-family: inherit;
  font-size: 1rem;
  min-height: 2.75rem;
  padding: 0.5rem 1.25rem;

  &:focus-visible {
    outline: 2px solid var(--var);
    outline-offset: 2px;
  }
`;

/**
 * The end of the game, and the rematch.
 *
 * Four outcomes, all read off `getResult` and none of them re-decided here.
 * The one worth the words is the third: THE WINNER IS READ OFF THE BOARD AND
 * NEED NOT BE THE PLAYER WHO MOVED. Pressing the button turns sixteen marbles,
 * and it is entirely possible to turn your opponent into a line — that is a real
 * rule, the best moment this game has, and a panel that just said "Gold wins"
 * would be hiding the interesting half of it.
 *
 * Held back until the line has finished lighting up: the highlight is the
 * announcement, and a panel sliding in over the top of it is an interruption.
 * It is a delay on an entrance animation only — the result is in the DOM and in
 * the live region from the first frame, so nothing waits on it.
 *
 * @param {Object} props
 * @param {Object} props.result - `getResult(game)`
 * @param {?Object} props.winner - The winning player descriptor, on a win
 * @param {?Object} props.mover - Whoever took the last turn
 * @param {Function} [props.onPlayAgain] - Omitted when this device may not start
 *   the next game — a spectator gets the result and no controls.
 */
export const Endgame = ({ mover, onPlayAgain, result, winner }) => {
  const orbitedIn =
    winner !== null && mover !== null && winner.slot !== mover.slot;

  return (
    <Panel>
      <Verdict style={{ "--slot": winner?.color }}>
        {result.draw ? (
          <>
            Draw
            <small>
              {result.drawReason === DrawReason.Simultaneous
                ? "Both lines completed on the same press. A tie is a tie."
                : "The board filled and five more presses found nothing."}
            </small>
          </>
        ) : (
          <>
            <span className="slot">{winner.name}</span> wins
            <small>
              {orbitedIn
                ? `${mover.name} turned the board into ${winner.name}'s line.`
                : "Four in a row after the orbit."}{" "}
              {winner.name} opens the next game.
            </small>
          </>
        )}
      </Verdict>

      {onPlayAgain && (
        <Again autoFocus onClick={onPlayAgain} type="button">
          Play again
        </Again>
      )}
    </Panel>
  );
};
