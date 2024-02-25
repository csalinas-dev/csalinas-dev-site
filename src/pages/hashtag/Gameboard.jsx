import styled from "@emotion/styled";
import { useContext } from "react";
import { Context } from "./context";
import { map } from "lodash";

const Board = styled.div`
  aspect-ratio: 1 / 1;
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(5, 1fr);
  grid-template-rows: repeat(5, 1fr);
  max-height: calc(100vw - 4rem);
  max-width: calc(100vh - 4rem);
  width: 100%;
  height: 100%;
`;

const Tile = styled.div`
  align-items: center;
  aspect-ratio: 1 / 1;
  background-color: var(--selectionBackground);
  border-radius: 10%;
  box-shadow: 0.025rem 0.05rem 0.2rem rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  overflow: hidden;
  text-shadow: 1px 1px var(--background);
  user-select: none;

  &.absent {
    background-color: var(--absentBackground);
    color: rgba(204, 204, 204, 0.54);
  }

  &.present {
    background-color: var(--selector);
    color: var(--background);
  }

  &.correct {
    background-color: var(--comment);
  }
`;

export const Gameboard = () => {
  const {
    state: { board },
  } = useContext(Context);

  const letterToTile = (tile, i) => {
    if (tile === null) {
      // Empty Space
      return <div></div>;
    }

    const { key, letter, status: className } = tile;

    const props = {
      key,
      className,
    };
    return <Tile {...props}>{letter}</Tile>;
  };

  return <Board>{map(board, (tile) => map(tile, letterToTile))}</Board>;
};
