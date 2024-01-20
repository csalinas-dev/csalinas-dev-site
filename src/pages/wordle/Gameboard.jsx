import { useContext, Fragment, useEffect } from "react";
import styled from "@emotion/styled";

import { Context } from "./context";
import { useResponsiveTiles } from "./useResponsiveTiles";
import { map } from "lodash";

const Error = styled.div`
  background-color: var(--invalid);
  border-radius: 1rem;
  box-shadow: 0.025rem 0.05rem 0.2rem rgba(0, 0, 0, 0.5);
  color: rgba(255, 255, 255, 0.87);
  margin: 1rem;
  max-width: 100%;
  padding: 1rem;
  position: absolute;
  top: 25vh;
`;

const Tile = styled.div`
  align-items: center;
  aspect-ratio: 1 / 1;
  background-color: var(--selectionBackground);
  border-radius: 10%;
  box-shadow: 0.025rem 0.05rem 0.2rem rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  min-height: 50px;
  min-width: 50px;
  text-shadow: 1px 1px var(--background);
  user-select: none;

  @media (min-aspect-ratio: 2/3) {
    aspect-ratio: initial;
    height: 100%;
  }

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
    state: { board, error },
  } = useContext(Context);
  const [tileRef, tileSize] = useResponsiveTiles();

  const letterToTile = ({ key, letter, status: className }, i) => {
    const font = tileSize * 0.75 + "px";
    const props = {
      key,
      className,
      style: {
        width: tileSize,
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
    <Fragment>
      {map(board, (word) => map(word, letterToTile))}
      {error && <Error>{error}</Error>}
    </Fragment>
  );
};

export default Gameboard;
