"use client";

import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";

const reveal = keyframes`
  from { opacity: 0; transform: translateY(-0.3rem); }
  to   { opacity: 1; transform: translateY(0); }
`;

// Under the board, not over it. The four highlighted pieces are what winning
// looks like, and a panel that covered them to announce the win would be
// announcing something the player can no longer see.
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
 * Held back until the winning line has finished lighting up — the highlight is
 * the announcement, and a panel sliding in over the top of it is an
 * interruption. It is a delay on an entrance animation only: the result is in
 * the DOM and in the live region from the first frame, so nothing waits on it.
 *
 * A draw is reported as a draw. Forty-two pieces and no line is a real outcome
 * and neither player lost it, so nothing here reaches for a name.
 *
 * @param {Object} props
 * @param {Object} props.game - The finished engine state
 * @param {Object} props.winner - The winning player descriptor, on a win
 * @param {Function} [props.onPlayAgain] - Omitted for a spectator, who gets the
 *   result and no controls.
 */
export const Endgame = ({ game, onPlayAgain, winner }) => (
  <Panel>
    <Verdict style={{ "--slot": winner?.color }}>
      {game.draw ? (
        <>
          Draw
          <small>The board is full and there is no line.</small>
        </>
      ) : (
        <>
          <span className="slot">{winner.name}</span> wins
          <small>
            {game.winningLine.length} in a row. {winner.name} opens the next game.
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
