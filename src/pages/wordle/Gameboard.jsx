import { useContext, Fragment } from "react";
import styled from "@emotion/styled";

import { Context } from "./context";
import { useError, useKeyboardInput, useResponsiveTiles } from "./hooks";
import { map } from "lodash";

const Alert = styled.div`
  align-items: center;
  border-radius: 1rem;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.5);
  display: flex;
  font-size: 2rem;
  justify-content: center;
  margin: 1rem;
  max-width: 100%;
  padding: 2rem 4rem;
  position: absolute;
  top: 25vh;

  &.error {
    background-color: var(--invalid);
    color: rgba(255, 255, 255, 0.87);
  }

  &.loss {
    background-color: var(--module);
    color: rgba(0, 0, 0, 0.87);
    flex-flow: column nowrap;
    gap: 2rem;
  }

  &.win {
    background-color: var(--vscode);
    color: rgba(0, 0, 0, 0.87);
  }

  svg {
    margin-right: 1rem;
  }
`;

const Word = styled.div`
  font-size: 4rem;
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
    state: { board, word, win },
  } = useContext(Context);
  const [tileRef, tileSize] = useResponsiveTiles();
  const error = useError();
  useKeyboardInput();

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
      {error && (
        <Alert className="error">
          <i className="fa-solid fa-triangle-exclamation"></i> {error}
        </Alert>
      )}
      {win === false && (
        <Alert className="loss">
          <div>
            <i className="fa-solid fa-face-frown-open"></i>Better luck next
            time!
          </div>
          <Word>{word}</Word>
        </Alert>
      )}
      {win === true && (
        <Alert className="win">
          <i className="fa-solid fa-trophy"></i>YOU WON!
        </Alert>
      )}
    </Fragment>
  );
};

export default Gameboard;
