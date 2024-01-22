import { useContext } from "react";
import styled from "@emotion/styled";

import { Context } from "./context";
import { useKeyboardInput, useResponsiveTiles } from "./hooks";
import { map } from "lodash";

const Container = styled.main`
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  grid-area: gameboard;
  justify-content: center;
  place-self: stretch;
`;

const Board = styled.div`
  aspect-ratio: 5 / 6;
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(5, 1fr);
  grid-template-rows: repeat(6, 1fr);
  max-width: 100vw;
`;

const Tile = styled.div`
  align-items: center;
  aspect-ratio: 1 / 1;
  background-color: var(--selectionBackground);
  border-radius: 10%;
  box-shadow: 0.025rem 0.05rem 0.2rem rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
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

const Gameboard = () => {
  const {
    state: { board },
  } = useContext(Context);
  const [tileRef, tileSize] = useResponsiveTiles();
  useKeyboardInput();

  const letterToTile = ({ key, letter, status: className }, i) => {
    const font = tileSize * 0.75 + "px";
    const props = {
      key,
      className,
      style: {
        lineHeight: font,
        fontSize: font,
      },
    };
    if (i === 0) {
      props.ref = tileRef;
    }
    return <Tile {...props}>{letter}</Tile>;
  };

  return (
    <Container>
      <Board>{map(board, (word) => map(word, letterToTile))}</Board>
    </Container>
  );
};

export default Gameboard;
