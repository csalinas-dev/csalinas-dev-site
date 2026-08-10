import styled from "@emotion/styled";
import { range } from "lodash";

import { Cell } from "./Cell";
import { useBoardNavigation } from "./hooks";

const Board = styled.div`
  aspect-ratio: 1 / 1;
  display: grid;
  gap: 0.5rem;
  /* minmax(0, 1fr), not a bare 1fr: 1fr means minmax(auto, 1fr), whose floor is
     the items' min-content size, so one oversized cell drags its whole column
     up with it. Pinning that floor to zero stops the feedback loop — while
     #136's glyph bug was live a marked cell measured 205.34 with a bare 1fr and
     160.42 with this, and its empty neighbours stayed 125.33 square instead of
     stretching to match. It does not keep the board square, and no track
     function can: this box has aspect-ratio with an auto height, which gives it
     a content-based automatic minimum in the ratio-dependent axis that grid
     sizing cannot reach, so a cell taller than its share still grows the board
     — with this guard applied #136 rendered 392 wide by 497.27 tall. Damage
     control, not a regression check: if you change what lives inside a Cell,
     measure the board box yourself. */
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: repeat(3, minmax(0, 1fr));
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
