import { useContext, Fragment } from "react";
import styled from "@emotion/styled";

import { Context } from "./context";
import { useResponsiveTiles } from "./useResponsiveTiles";

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

  return <Fragment>{board.map((word) => word.map(letterToTile))}</Fragment>;
};

export default Gameboard;
