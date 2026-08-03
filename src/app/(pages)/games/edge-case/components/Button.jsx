import styled from "@emotion/styled";

// The game's one button, shared by the mode picker, the join form and the
// lobby. The board has controls of its own — those are edges and swatches, not
// buttons, and they are not this.
export const Button = styled.button`
  background-color: var(--selectionBackground);
  border: 1px solid var(--selectionBackground);
  border-radius: 0.5rem;
  color: var(--foreground);
  cursor: pointer;
  font-family: inherit;
  font-size: 1rem;
  min-height: 2.75rem;
  padding: 0.5rem 1.25rem;
  transition: background-color ease-in-out 150ms;

  &:hover:not(:disabled) {
    background-color: var(--absentBackground);
  }

  &:focus-visible {
    outline: 2px solid var(--var);
    outline-offset: 2px;
  }

  &:disabled {
    color: var(--absentForeground);
    cursor: default;
  }
`;

/** The one thing on a screen that the player is meant to press. */
export const PrimaryButton = styled(Button)`
  border-color: var(--component);
  color: var(--component);
`;
