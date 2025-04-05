import styled from "@emotion/styled";
import { useContext } from "react";

import { Context, playAgain } from "@wordleverse/_context";

const Button = styled.span`
  background-color: var(--background);
  border-radius: 0.5rem;
  color: var(--foreground);
  cursor: pointer;
  padding: 0.5rem 1rem;
  font-size: 1rem;
`;

export const PlayAgain = () => {
  const { dispatch } = useContext(Context);

  return <Button onClick={() => dispatch(playAgain())}>Play again!</Button>;
};
