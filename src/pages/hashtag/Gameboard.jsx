import styled from "@emotion/styled";
import { useContext } from "react";
import { map } from "lodash";
import { Context } from "./context";
import { Tile } from "./Tile";

const Board = styled.div`
  aspect-ratio: 1 / 1;
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(5, 1fr);
  grid-template-rows: repeat(5, 1fr);
  max-height: calc(100vw - 6rem);
  max-width: calc(100vh - 4rem);
  width: calc(100% - 2rem);
`;

export const Gameboard = () => {
  const {
    state: { board },
  } = useContext(Context);

  return (
    <Board>
      {map(board, (tile, i) => {
        if (tile === null) {
          return <div key={`spacer-${i}`}></div>;
        }
        return <Tile key={tile.key} tile={tile} />;
      })}
    </Board>
  );
};
