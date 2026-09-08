import styled from "@emotion/styled";

// The game's one button. The mode picker, the join form, the waiting room and
// the room strip all press the same thing.
export const Button = styled.button`
  background-color: var(--selectionBackground);
  border: 1px solid var(--selectionBackground);
  border-radius: 0.5rem;
  color: var(--foreground);
  cursor: pointer;
  font-family: inherit;
  font-size: 1rem;
  padding: 0.5rem 1.25rem;
  transition: background-color ease-in-out 150ms;

  &:hover {
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
