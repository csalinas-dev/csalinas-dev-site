"use client";

import styled from "@emotion/styled";

const Container = styled.div`
  align-items: center;
  background-color: var(--absentBackground);
  display: flex;
  flex-flow: row nowrap;
  font-size: 1rem;
  gap: 0.5rem;
  left: 0;
  line-height: 1rem;
  padding: 0.5rem 1rem;
  position: absolute;
  right: 0;
  top: 0;

  @media (max-width: 600px) {
    font-size: 0.85rem;
    padding: 0.5rem 0.75rem;
  }
`;

// The game's name is the longest thing here and the page title already says it,
// so it is the first thing to go when the toolbar runs out of room.
const Name = styled.div`
  flex: 1 1 auto;
  white-space: nowrap;

  @media (max-width: 480px) {
    display: none;
  }
`;

const Progress = styled.div`
  color: var(--absentForeground);
  flex: 1 1 auto;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`;

const Action = styled.button`
  background-color: transparent;
  border: 1px solid transparent;
  border-radius: 0.35rem;
  color: var(--component);
  cursor: pointer;
  flex: 0 0 auto;
  font-size: inherit;
  min-height: 2rem;
  padding: 0.35rem 0.5rem;
  white-space: nowrap;

  &[aria-pressed="true"] {
    border-color: var(--component);
  }

  &:focus-visible {
    outline: 2px solid var(--var);
    outline-offset: 2px;
  }
`;

/**
 * The strip across the top of the board.
 *
 * Both actions are optional, and a null handler means the button is not there
 * at all rather than there and inert. Online, Setup never applies — the board
 * size is the host's, decided in the lobby — and Restart only appears once the
 * game is over, because a shared board is not one player's to wipe.
 */
export const Toolbar = ({ claimed, boxes, onRestart, onToggleSetup, setupOpen }) => (
  <Container>
    <Name>Edge Case</Name>
    <Progress>
      {claimed} / {boxes} boxes
    </Progress>
    {onToggleSetup && (
      <Action
        aria-expanded={setupOpen}
        aria-pressed={setupOpen}
        onClick={onToggleSetup}
        type="button"
      >
        {/* The Font Awesome kit replaces these <i>s with <svg>s after mount, so
            each one lives in a wrapper React owns — otherwise unmounting the
            button React no longer recognises throws. */}
        <span>
          <i className="fa-solid fa-sliders" />
        </span>{" "}
        Setup
      </Action>
    )}
    {onRestart && (
      <Action onClick={onRestart} type="button">
        <span>
          <i className="fa-solid fa-rotate-left" />
        </span>{" "}
        {onToggleSetup ? "Restart" : "Play again"}
      </Action>
    )}
  </Container>
);
