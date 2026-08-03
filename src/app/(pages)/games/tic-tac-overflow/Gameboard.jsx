import styled from "@emotion/styled";
import { range } from "lodash";

import { Cell } from "./Cell";
import { useBoardNavigation } from "./hooks";

const Board = styled.div`
  aspect-ratio: 1 / 1;
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  /* Square, but never tall enough to push the status line off a short screen. */
  width: min(100%, 26rem, calc(100svh - 19rem));
`;

export const Gameboard = () => {
  const { onKeyDown, register } = useBoardNavigation();

  return (
    <Board aria-label="Tic-Tac-Overflow board" role="group">
      {range(9).map((index) => (
        <Cell
          index={index}
          key={index}
          onKeyDown={onKeyDown}
          register={register}
        />
      ))}
    </Board>
  );
};
