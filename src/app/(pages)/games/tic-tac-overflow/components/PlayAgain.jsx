import { useContext } from "react";
import styled from "@emotion/styled";

import { Context, playAgain } from "../context";

const Button = styled.button`
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

export const PlayAgain = () => {
  const {
    state: { moves, winner },
    dispatch,
  } = useContext(Context);

  return (
    <Button
      disabled={moves === 0}
      onClick={() => dispatch(playAgain())}
      type="button"
    >
      <span>
        <i className="fa-solid fa-rotate-left" />
      </span>{" "}
      {winner === null ? "Reset board" : "Play again!"}
    </Button>
  );
};
