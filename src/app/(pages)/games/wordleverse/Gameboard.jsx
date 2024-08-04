import { useContext } from "react";
import styled from "@emotion/styled";
import { map } from "lodash";

import { Context } from "./context";
import { useKeyboardInput } from "./hooks";

const Board = styled.div`
  aspect-ratio: 365 / 438;
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(5, 1fr);
  grid-template-rows: repeat(6, 1fr);
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

const Gameboard = ({ width, height }) => {
  const {
    state: { board },
  } = useContext(Context);
  useKeyboardInput();

  const tileSize = width ? (width - 32) / 5 : (height - 40) / 6;
  const font = tileSize * 0.75;

  const letterToTile = ({ key, letter, status: className }, i) => {
    const props = {
      className,
      style: {
        lineHeight: font + "px",
        fontSize: font + "px",
      },
    };
    return <Tile key={key} {...props}>{letter}</Tile>;
  };

  return (
    <Board style={{ width, height }}>
      {map(board, (word) => map(word, letterToTile))}
    </Board>
  );
};

export default Gameboard;
